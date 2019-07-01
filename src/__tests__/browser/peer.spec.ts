import { Instance as SimplePeerInstance } from "simple-peer";
import { IStream } from "../../base/stream-provider";
import { IWebrtcProvider } from "../../base/webrtc-provider";
import { Peer } from "../../browser/peer";

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

jest.mock("../../base/webrtc-provider");

describe("Peer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allocate a SimplePeer on initialization", () => {
    const expectedRawStream = {
      rawStream: true,
    };
    const toMediaStream = jest.fn().mockReturnValueOnce(expectedRawStream);
    const transformSdp = jest.fn();
    const expectedStream: IStream = {
        toMediaStream,
    };
    const instance = new Peer({
      sdpHandler: {
        transformSdp,
      },
    });

    instance.initialize([], expectedStream);

    expect(IWebrtcProvider).toHaveBeenCalledTimes(1);

    expect(LastAllocatedSimplePeerCtor).toHaveBeenCalledTimes(1);
    const ctorOpts = LastAllocatedSimplePeerCtor.mock.calls[0][0];
    expect(ctorOpts.config).toEqual({
      iceServers: [],
    });
    expect(ctorOpts.initiator).toBe(false);
    expect(typeof ctorOpts.sdpTransform).toBe("function");
    expect(ctorOpts.stream).toEqual(expectedRawStream);

    expect(SimplePeer.on).toHaveBeenCalledTimes(5);
    expect(SimplePeer.on.mock.calls[0][0]).toBe("error");
    expect(SimplePeer.on.mock.calls[1][0]).toBe("connect");
    expect(SimplePeer.on.mock.calls[2][0]).toBe("close");
    expect(SimplePeer.on.mock.calls[3][0]).toBe("signal");
    expect(SimplePeer.on.mock.calls[4][0]).toBe("data");
  });

  it("should not support being initialized twice", () => {
    const instance = new Peer({
      sdpHandler: {
        transformSdp: jest.fn(),
      },
    });
    instance.initialize([], { toMediaStream: jest.fn() });
    expect(() => instance.initialize([], { toMediaStream: jest.fn() })).toThrowError(/Already initialized/);
  });

  it("should pass through sdpHandler", () => {
    const expectedTransformData = "test";
    const transformSdp = jest.fn();
    const instance = new Peer({
      sdpHandler: {
        transformSdp,
      },
    });

    instance.initialize([], { toMediaStream: jest.fn() });
    const ctorData = LastAllocatedSimplePeerCtor.mock.calls[0][0];
    ctorData.sdpTransform(expectedTransformData);
    expect(transformSdp).toHaveBeenCalledTimes(1);
    expect(transformSdp).toHaveBeenCalledWith(expectedTransformData);
  });

  it("should proxy signal calls", () => {
    const expectedSignalData = "test";
    const transformSdp = jest.fn();
    const instance = new Peer({
      sdpHandler: {
        transformSdp,
      },
    });

    instance.initialize([], { toMediaStream: jest.fn() });

    instance.signal("test");

    expect(SimplePeer.signal).toHaveBeenCalledTimes(1);
    expect(SimplePeer.signal).toHaveBeenCalledWith(expectedSignalData);
  });

  it("should not proxy incorrectly setup signals", () => {
    const instance = new Peer({
      sdpHandler: {
        transformSdp: jest.fn(),
      },
    });

    instance.signal("test");

    expect(SimplePeer.signal).toHaveBeenCalledTimes(0);
  });

  it("should be destroyable", () => {
    const transformSdp = jest.fn();
    const instance = new Peer({
      sdpHandler: {
        transformSdp,
      },
    });

    instance.initialize([], { toMediaStream: jest.fn() });
    instance.destroy();

    expect(SimplePeer.destroy).toHaveBeenCalledTimes(1);
  });

  it("should not be destroy-able until initialize", () => {
    const instance = new Peer({
      sdpHandler: {
        transformSdp: jest.fn(),
      },
    });

    instance.destroy();

    expect(SimplePeer.destroy).toHaveBeenCalledTimes(0);
  });
});
