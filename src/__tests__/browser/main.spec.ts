import pino from "pino";
import {
  K_BROWSER_STORAGE, K_PRELOAD_LOGGER_KEY,
} from "../../base/constants";
import { Application as BrowserApplication } from "../../browser/application";

jest.mock("pino");
jest.mock("electron", () => {
  const glob: {[key: string]: any} = {};

  glob[K_PRELOAD_LOGGER_KEY] = pino();
  glob[K_BROWSER_STORAGE] = {};

  return {
    desktopCapturer: {
      getSources: jest.fn(),
    },
    remote: {
      BrowserWindow: {
        getAllWindows: jest.fn().mockReturnValue({
          find: jest.fn().mockReturnValue({
            isMockWindow: true,
          }),
        }),
      },
      getGlobal: jest.fn().mockReturnValue(glob),
    },
  };
});

const Application: jest.Mocked<BrowserApplication> = {
  boot: jest.fn().mockImplementation(() => Promise.resolve()),
} as Partial<BrowserApplication> as any;

jest.mock("../../browser/application", () => {
  return {
    Application: jest.fn().mockImplementation(() => {
      return Application;
    }),
  };
});

(navigator as any).mediaDevices = {
  getUserMedia: jest.fn(),
};

describe("main.browser", () => {
  // TODO(bengreenier): make this test (and it's mocks) more robust
  it("should eval", async () => {
    const runtimeExportValue = require("../../browser/main");
    await runtimeExportValue;
    expect(Application.boot).toHaveBeenCalledTimes(1);
  });
});
