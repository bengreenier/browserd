import * as path from "path";
import pino from "pino";
import {
  K_BROWSER_CONFIG,
  K_BROWSER_STORAGE,
  K_CAPTURE_WIN,
  K_PRELOAD_LOGGER_KEY,
  K_SIGNAL_CONFIG,
} from "../../base/constants";
import { IWindow, IWindowProvider } from "../../base/window-provider";
import { Application } from "../../node/application";

jest.mock("pino");

const Window: jest.Mocked<IWindow> = {
  hide: jest.fn(),
} as Partial<IWindow> as any;

const WinProvider: jest.Mocked<IWindowProvider> = {
  createWindow: jest.fn().mockReturnValue(Window),
} as Partial<IWindowProvider> as any;

describe("Application", () => {
  it("should work", async () => {
    const expectedWindowTitle = "test";
    const expectedUrl = "http://visual.test.com";
    const expectedWidth = 10;
    const expectedHeight = 10;
    const expectedHideStreamer = true;
    const expectedPollUrl = "http://poll.test.com";
    const expectedInterval = 1020;
    const expectedIceServers: RTCIceServer[] = [];
    const expectedLogger = pino();

    const instance = new Application({
      captureWindowTitle: expectedWindowTitle,
      expHideStreamer: expectedHideStreamer,
      height: expectedHeight,
      logger: expectedLogger,
      signalConfig: {
        pollIntervalMs: expectedInterval,
        url: expectedPollUrl,
      },
      streamerConfig: {
        iceServers: expectedIceServers,
      },
      url: expectedUrl,
      width: expectedWidth,
      winProvider: WinProvider,
    });

    await instance.boot();

    expect(WinProvider.createWindow).toHaveBeenCalledTimes(2);
    expect(WinProvider.createWindow).toHaveBeenNthCalledWith(1, {
      alwaysOnTop: true,
      backgroundColor: "#000",
      height: expectedHeight,
      logger: expectedLogger,
      title: expectedWindowTitle,
      url: expectedUrl,
      webPreferences: {
        contextIsolation: true,
        disableBlinkFeatures: "Auxclick",
      },
      width: expectedWidth,
    });
    // note: the values here are __not__ driven by config
    expect(WinProvider.createWindow).toHaveBeenNthCalledWith(2, {
      height: 10,
      logger: expectedLogger,
      url: "chrome://webrtc-internals",
      webPreferences: {
        preload: path.join(__dirname, "../../browser/main.js"),
      },
      width: 10,
    });
    expect(Window.hide).toHaveBeenCalledTimes(1);

    const globalStorage: {[key: string]: any} = {};
    globalStorage[K_PRELOAD_LOGGER_KEY] = expectedLogger;
    globalStorage[K_CAPTURE_WIN] = expectedWindowTitle;
    globalStorage[K_BROWSER_CONFIG] = {
      iceServers: expectedIceServers,
    };
    globalStorage[K_SIGNAL_CONFIG] = {
      pollIntervalMs: expectedInterval,
      url: expectedPollUrl,
    };
    expect((global as any)[K_BROWSER_STORAGE]).toEqual(globalStorage);
  });
});
