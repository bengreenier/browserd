import { default as fetchFill, GlobalWithFetchMock } from "jest-fetch-mock";
import $ from "jquery";
import { readFileSync } from "fs";
import * as path from "path";
import { Instance as SimplePeerInstance } from "simple-peer";
import { connect, signIn, startStreaming } from "../main";
import { BaseSignalProvider, ISignalPeer } from "../../../shared/src/signal-provider";

// mock global.fetch and provide global.fetchMock to control it
{
  const customGlobal: GlobalWithFetchMock = global as GlobalWithFetchMock;
  customGlobal.fetch = fetchFill as any;
  customGlobal.fetchMock = customGlobal.fetch;
}

// mock simple peer
const SimplePeer: jest.Mocked<SimplePeerInstance> = {
  destroy: jest.fn(),
  on: jest.fn(),
  signal: jest.fn(),
} as Partial<SimplePeerInstance> as any;

let LastAllocatedSimplePeerCtor: jest.Mock<any, any>;

jest.mock("simple-peer", () => {
  // we must allocate this inside the "mock" definition, as
  // mock calls are hoisted at runtime by jest (above imports)
  // so allocating inline above and simply returning here is not possible.
  LastAllocatedSimplePeerCtor = jest.fn().mockImplementation(() => {
    return SimplePeer;
  });
  return LastAllocatedSimplePeerCtor;
});

describe("signIn", () => {
  it("fail to find any stream provider", async () => {
    const consumerId = "1";
    const peers: ISignalPeer[] = [
      {
        connected: true,
        id: consumerId,
        name: "consumer",
      },
    ];

    const Signal: jest.Mocked<BaseSignalProvider> = {
      id: consumerId,
      signIn: _ => Promise.resolve(peers),
    } as Partial<BaseSignalProvider> as any;

    await expect(signIn(Signal)).rejects.toThrowError();
  });

  it("should find a stream provider", async () => {
    const providerId = "1";
    const consumerId = "2";
    const peers: ISignalPeer[] = [
      {
        connected: true,
        id: providerId,
        name: "provider",
      },
      {
        connected: true,
        id: consumerId,
        name: "consumer",
      },
    ];

    const Signal: jest.Mocked<BaseSignalProvider> = {
      id: consumerId,
      signIn: _ => Promise.resolve(peers),
    } as Partial<BaseSignalProvider> as any;

    await expect(signIn(Signal)).resolves.toEqual(providerId);
  });
});

describe("connect", () => {
  // Prepare html page for testing
  const pollInterval = 1000;
  const signalingServer = "fakesignalingserver";
  const turnPassword = "password";
  const turnServer = "faketurnserver";
  const turnUsername = "username";
  const html = readFileSync(path.resolve(__dirname, "../../index.html")).toString();
  document.documentElement.innerHTML = html;
  $("#poll-interval").val(pollInterval);
  $("#signaling-server").val(signalingServer);
  $("#turn-password").val(turnPassword);
  $("#turn-server").val(turnServer);
  $("#turn-username").val(turnUsername);

  it("should connect to stream provider", async () => {
    // Init mock values for signaling
    const providerId = "1";
    const consumerId = "2";
    const peerData = `provider,${providerId},1`;
    fetchMock.mockResponseOnce(peerData, {
      headers: {
        pragma: consumerId,
      },
    });

    await connect();

    // Verify simple peer initialization and event handling
    expect(LastAllocatedSimplePeerCtor).toHaveBeenCalledTimes(1);
    const ctorOpts = LastAllocatedSimplePeerCtor.mock.calls[0][0];
    expect(ctorOpts.config).toEqual({
      iceServers: [
        {
          credential: turnPassword,
          credentialType: "password",
          urls: [turnServer],
          username: turnUsername,
        },
      ],
    });

    expect(SimplePeer.on).toHaveBeenCalledTimes(5);
    expect(SimplePeer.on.mock.calls[0][0]).toBe("error");
    expect(SimplePeer.on.mock.calls[1][0]).toBe("connect");
    expect(SimplePeer.on.mock.calls[2][0]).toBe("close");
    expect(SimplePeer.on.mock.calls[3][0]).toBe("signal");
    expect(SimplePeer.on.mock.calls[4][0]).toBe("stream");
  });

  it("should stream video", () => {
    const rstream: jest.Mocked<MediaStream> = {
      id: "fakestream",
      active: true,
    } as Partial<MediaStream> as any;

    const videoElement = $("#remote-video") as any as HTMLVideoElement[];
    let playing = false;
    Object.defineProperty(videoElement[0], "play", {
      value: function () {
        playing = true;
      },
    });

    expect(videoElement[0].srcObject).toBeFalsy();
    expect(playing).toBeFalsy();

    startStreaming(rstream, SimplePeer);

    expect(videoElement[0].srcObject).toEqual(rstream);
    expect(playing).toBeTruthy();
  });
});
