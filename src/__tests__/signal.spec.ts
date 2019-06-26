import { parsePeers } from "..";
import { ISignalOpts, Signal } from "../signal";

jest.mock("../index");

describe("Signal", () => {
  const defaultCtorArgs: ISignalOpts = {
    pollIntervalMs: 1000,
    url: "http://fake",
  };
  let testInstance: Signal;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    testInstance = new Signal(defaultCtorArgs);
  });

  afterEach(() => {
    testInstance.destroy();
  });

  describe("ctor", () => {
    it("should not throw", () => {
      expect(() => {
        // tslint:disable-next-line: no-unused-expression
        new Signal(defaultCtorArgs);
      }).not.toThrow();
    });

    it("should have defaults", () => {
      expect(testInstance.id).toBeUndefined();
      expect(testInstance.pollInterval).toBe(defaultCtorArgs.pollIntervalMs);
      expect(testInstance.url).toBe(defaultCtorArgs.url);
    });

    it("should be destroyable", () => {
      testInstance.destroy();
      expect(testInstance.id).toBeUndefined();

      // but should not destroy the ctor-given data
      expect(testInstance.pollInterval).toBe(defaultCtorArgs.pollIntervalMs);
      expect(testInstance.url).toBe(defaultCtorArgs.url);
    });
  });

  describe("signIn", () => {
    it("should sign in (no other peers)", async () => {
      const expectedPeerName = "peerName";
      const expectedPeerId = "123";
      const expectedUrl = `${defaultCtorArgs.url}/sign_in?` +
        `peer_name=${expectedPeerName}`;
      const expectedEmptyData = "";

      fetchMock.mockResponseOnce(expectedEmptyData, {
        headers: {
          pragma: expectedPeerId,
        },
      });

      await testInstance.signIn(expectedPeerName);
      expect(testInstance.id).toBe(expectedPeerId);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(expectedUrl);
      expect(setInterval).toHaveBeenCalledTimes(1);
    });

    it("should sign in (other peers)", async () => {
      const expectedPeerName = "peerName";
      const expectedPeerId = "123";
      const expectedPeerData = "remotePeer,321,1";

      fetchMock.mockResponseOnce(expectedPeerData, {
        headers: {
          pragma: expectedPeerId,
        },
      });

      await testInstance.signIn(expectedPeerName);
      expect(parsePeers).toHaveBeenCalledTimes(1);
      expect(parsePeers).toHaveBeenCalledWith(expectedPeerData);
    });

    it("should gracefully fail to sign in", async () => {
      fetchMock.mockRejectOnce(new Error("Mock Failure"));

      await expect(testInstance.signIn("peerName")).rejects.toBeInstanceOf(Error);
    });

    it("should fail if no peer id is returned", async () => {
      fetchMock.mockResponseOnce("", {
        headers: {},
      });

      await expect(testInstance.signIn("peerName")).rejects.toBeInstanceOf(Error);
    });
  });

  describe("signOut", () => {
    it("should sign out", async () => {
      const expectedPeerId = "123";
      const expectedIntervalId = 1;

      // here, we modify a private to make our test case simpler
      // however, we know from the above signIn tests that the runtime sets this successfully
      // so we know this isn't hurting our coverage
      (testInstance as any).backingId = expectedPeerId;
      expect(testInstance.id).toBe(expectedPeerId);
      (testInstance as any).longpollIntervalId = expectedIntervalId;

      fetchMock.mockResponseOnce("", { status: 200 });

      await testInstance.signOut();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(`${defaultCtorArgs.url}/sign_out?peer_id=${expectedPeerId}`);
      expect(testInstance.id).toBeUndefined();
      expect(global.clearInterval).toHaveBeenCalledTimes(1);
      expect(global.clearInterval).toHaveBeenCalledWith(expectedIntervalId);
    });

    it("should gracefully fail to sign out", async () => {
      fetchMock.mockRejectOnce(new Error("Mock Failure"));

      await expect(testInstance.signOut()).rejects.toBeInstanceOf(Error);
    });
  });

  describe("send", () => {
    it("should send messages", async () => {
      const expectedPeerId = "123";
      const expectedRemotePeerId = "321";
      const expectedPeerData = "hello world";
      const expectedUrl = `${defaultCtorArgs.url}/message?peer_id=${expectedPeerId}&to=${expectedRemotePeerId}`;

      // here, we modify a private to make our test case simpler
      // however, we know from the above signIn tests that the runtime sets this successfully
      // so we know this isn't hurting our coverage
      (testInstance as any).backingId = expectedPeerId;
      expect(testInstance.id).toBe(expectedPeerId);

      fetchMock.mockResponseOnce("", { status: 200 });

      await testInstance.send(expectedPeerData, expectedRemotePeerId);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(expectedUrl, {
        body: expectedPeerData,
        method: "POST",
      });
    });

    it("should gracefully fail to send", async () => {
      fetchMock.mockRejectOnce(new Error("Mock Failure"));

      await expect(testInstance.send("", "")).rejects.toBeInstanceOf(Error);
    });

    it("should gracefully fail if the server errors", async () => {
      fetchMock.mockResponseOnce("", { status: 404 });

      await expect(testInstance.send("", "")).rejects.toBeInstanceOf(Error);
    });
  });

  describe("poll", () => {
    it("should peer message", async () => {
      const expectedPeerId = "123";
      const expectedRemotePeerId = "321";

      fetchMock
        .mockResponseOnce("", { status: 200, headers: { pragma: expectedPeerId } })
        .mockResponseOnce("hello", { status: 200, headers: { pragma: expectedRemotePeerId } });

      const onPeerMessage = jest.fn();
      const peerMessageCalled = new Promise((resolve) => {
        onPeerMessage.mockImplementationOnce(() => {
          resolve();
        });
      });
      testInstance.on("peer-message", onPeerMessage);

      await testInstance.signIn("name");
      expect(global.setInterval).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000);

      await peerMessageCalled;
      expect(onPeerMessage).toHaveBeenCalledTimes(1);
      expect(onPeerMessage).toHaveBeenCalledWith("hello", "321");
      expect(fetchMock).toHaveBeenLastCalledWith(`${defaultCtorArgs.url}/wait?peer_id=${expectedPeerId}`);
    });

    it("should peer update", async () => {
      const expectedPeerId = "123";
      const expectedRemotePeerId = "321";
      const expectedPeerData = `remote,${expectedRemotePeerId},1`;
      const expectedParseRaiseEventData = "raised from parsed";

      fetchMock
        .mockResponseOnce("", { status: 200, headers: { pragma: expectedPeerId } })
        .mockResponseOnce(expectedPeerData, { status: 200, headers: { pragma: expectedPeerId } });

      // we'll want to assert against the value (ensuring it's raised via our event)
      // so we must actually provide some value
      (parsePeers as jest.Mock).mockImplementation(() => {
        return expectedParseRaiseEventData;
      });

      const onPeerUpdate = jest.fn();
      const peerUpdateCalled = new Promise((resolve) => {
        onPeerUpdate.mockImplementationOnce(() => {
          resolve();
        });
      });
      testInstance.on("peer-update", onPeerUpdate);

      await testInstance.signIn("name");
      expect(global.setInterval).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000);

      await peerUpdateCalled;
      // expect this is called 2x, one during signIn
      expect(parsePeers).toHaveBeenCalledTimes(2);
      expect(parsePeers).toHaveBeenLastCalledWith(expectedPeerData);
      expect(onPeerUpdate).toHaveBeenCalledTimes(1);
      expect(onPeerUpdate).toHaveBeenCalledWith(expectedParseRaiseEventData);
    });

    it("should error (404)", async () => {
      const expectedPeerId = "123";
      const expectedRemotePeerId = "321";

      fetchMock
        .mockResponseOnce("", { status: 200, headers: { pragma: expectedPeerId } })
        .mockResponseOnce("", { status: 404, headers: { pragma: expectedRemotePeerId } });

      const onError = jest.fn();
      const errorCalled = new Promise((resolve) => {
        onError.mockImplementationOnce(() => {
          resolve();
        });
      });
      testInstance.on("error", onError);

      await testInstance.signIn("name");
      expect(global.setInterval).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(1000);

      await errorCalled;
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });
});
