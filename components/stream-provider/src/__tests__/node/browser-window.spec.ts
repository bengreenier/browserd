import { BrowserWindow as ElectronBrowserWindow } from "electron";
import { BrowserWindow } from "../../node/browser-window";

const BrowserWindowNative: jest.Mocked<ElectronBrowserWindow> = {
  hide: jest.fn(),
  show: jest.fn(),
} as Partial<ElectronBrowserWindow> as any;

describe("BrowserWindow", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should construct", () => {
    const instance = new BrowserWindow(BrowserWindowNative);
    expect(instance.toBrowserWindow()).toBe(BrowserWindowNative);
  });

  it("should proxy hide", () => {
    const instance = new BrowserWindow(BrowserWindowNative);
    instance.hide();
    expect(BrowserWindowNative.hide).toHaveBeenCalledTimes(1);
  });

  it("should proxy show", () => {
    const instance = new BrowserWindow(BrowserWindowNative);
    instance.show();
    expect(BrowserWindowNative.show).toHaveBeenCalledTimes(1);
  });
});
