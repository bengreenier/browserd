import { BaseSignalProvider } from "@browserd/shared";
import pino from "pino";
import { IInputHandler } from "../../base/input-handler";
import { IDeviceInfo, IStream, IStreamProvider } from "../../base/stream-provider";
import { BaseWebrtcProvider } from "../../base/webrtc-provider";
import { Application } from "../../browser/application";

jest.mock("pino");

const SignalProvider: jest.Mocked<BaseSignalProvider> = {
  destroy: jest.fn(),
  on: jest.fn(),
  send: jest.fn().mockImplementation(() => Promise.resolve()),
  signIn: jest.fn().mockResolvedValue([]),
  signOut: jest.fn().mockImplementation(() => Promise.resolve()),
} as Partial<BaseSignalProvider> as any;

const Stream: jest.Mocked<IStream> = {
  toMediaStream: jest.fn(),
} as Partial<IStream> as any;

const Device: jest.Mocked<IDeviceInfo> = {
  id: "test",
  name: "testDevice",
} as Partial<IDeviceInfo> as any;

const StreamProvider: jest.Mocked<IStreamProvider> = {
  createStream: jest.fn().mockResolvedValue(Stream),
  enumerateDevices: jest.fn().mockResolvedValue([Device]),
} as Partial<IStreamProvider> as any;

const WebrtcProvider: jest.Mocked<BaseWebrtcProvider> = {
  destroy: jest.fn(),
  initialize: jest.fn(),
  on: jest.fn(),
  signal: jest.fn(),
} as Partial<BaseWebrtcProvider> as any;

const InputHandler: jest.Mocked<IInputHandler> = {
  processAndRaiseMessage: jest.fn(),
} as Partial<IInputHandler> as any;

describe("Browser/Application", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should boot", async () => {
    const expectedIceServers: RTCIceServer[] = [];
    const expectedWindowTitle = "test";
    const instance = new Application({
      captureWindowTitle: expectedWindowTitle,
      iceServers: expectedIceServers,
      inputHandler: InputHandler,
      logger: pino(),
      signalProvider: SignalProvider,
      streamProvider: StreamProvider,
      webrtcProvider: WebrtcProvider,
    });

    await instance.boot();

    expect(StreamProvider.enumerateDevices).toHaveBeenCalledTimes(1);
    expect(StreamProvider.createStream).toHaveBeenCalledTimes(1);
    expect(StreamProvider.createStream).toHaveBeenCalledWith(Device);
    expect(WebrtcProvider.initialize).toHaveBeenCalledTimes(1);
    expect(WebrtcProvider.initialize).toHaveBeenCalledWith(expectedIceServers, Stream);
    expect(SignalProvider.signIn).toHaveBeenCalledTimes(1);
    expect(SignalProvider.signIn.mock.calls[0][0]).toMatch(new RegExp(`^${expectedWindowTitle}`));
  });

  it("should error if it cannot find devices", async () => {
    const expectedIceServers: RTCIceServer[] = [];
    const expectedWindowTitle = "test";
    const instance = new Application({
      captureWindowTitle: expectedWindowTitle,
      iceServers: expectedIceServers,
      inputHandler: InputHandler,
      logger: pino(),
      signalProvider: SignalProvider,
      streamProvider: StreamProvider,
      webrtcProvider: WebrtcProvider,
    });

    // emulate no devices!
    StreamProvider.enumerateDevices.mockResolvedValueOnce([]);

    await expect(instance.boot()).rejects.toBeInstanceOf(Error);
  });

  it("should handle events", async () => {
    const expectedCandidateData = {
      data: "value",
      test: true,
    };
    const expectedData = {
      candidate: expectedCandidateData,
    };
    const expectedWebrtcRawData = {
      test: true,
    };
    const expectedPeerId = "12";
    const expectedIceServers: RTCIceServer[] = [];
    const expectedWindowTitle = "test";
    const logger = pino();
    const instance = new Application({
      captureWindowTitle: expectedWindowTitle,
      iceServers: expectedIceServers,
      inputHandler: InputHandler,
      logger,
      signalProvider: SignalProvider,
      streamProvider: StreamProvider,
      webrtcProvider: WebrtcProvider,
    });

    await instance.boot();

    // the 1st call (index 0) is the .on("error") handler registration
    // so this tests that if an error occurs, the following occurs
    SignalProvider.on.mock.calls[0][1](new Error("test"));
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith("Browser: signal error: Error: test");

    // the 2nd call (index 1) is the .on("peer-message") handler registration
    // so this tests that if the signal provider has a peer-message, the following occurs
    SignalProvider.on.mock.calls[1][1](JSON.stringify(expectedData), expectedPeerId);
    expect(WebrtcProvider.signal).toHaveBeenCalledTimes(1);
    // double candidate for webrtc input
    expect(WebrtcProvider.signal).toHaveBeenCalledWith({
      candidate: expectedData,
    });

    // the first call (index 0) is the .on("signal") handler registration
    // so this tests that if the provider has a signal, the following occurs
    // note: we await the function call since the handler is async
    await WebrtcProvider.on.mock.calls[0][1](expectedData);
    expect(SignalProvider.send).toHaveBeenCalledTimes(1);
    // single candidate for signaler input
    expect(SignalProvider.send).toHaveBeenCalledWith(JSON.stringify(expectedCandidateData), expectedPeerId);

    // the second call (index 1) is the .on("data") handler registration
    // so this tests that if the provider has a data, the following occurs
    WebrtcProvider.on.mock.calls[1][1](JSON.stringify(expectedData));
    expect(InputHandler.processAndRaiseMessage).toHaveBeenCalledTimes(1);
    expect(InputHandler.processAndRaiseMessage).toHaveBeenCalledWith(expectedData);
  });
});
