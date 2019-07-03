import { BrowserWindow as ElectronBrowserWindow, Event as ElectronEvent } from "electron";
import { Win } from "../../node/win";

const session = {
  on: jest.fn(),
}

const webContents = {
  loadURL: jest.fn(),
  on: jest.fn(),
  session,
} as any;

const BrowserWindow: jest.Mocked<ElectronBrowserWindow> = {
  loadURL: jest.fn().mockImplementation(() => Promise.resolve()),
  on: jest.fn(),
  once: jest.fn().mockImplementation((_, cb) => {
    cb();
  }),
  show: jest.fn(),
  webContents,
} as Partial<ElectronBrowserWindow> as any;

jest.mock("electron", () => {
  return {
    BrowserWindow: jest.fn().mockImplementation(() => {
      return BrowserWindow;
    }),
  };
});

describe("Win", () => {
  it("should create windows", async () => {
    const expectedUrl = "https://test.com";
    const expectedTitle = "windowTitle";
    const instance = new Win();

    const win = await instance.createWindow({
      title: expectedTitle,
      url: expectedUrl,
    });

    expect(ElectronBrowserWindow).toHaveBeenCalledTimes(1);
    expect(ElectronBrowserWindow).toHaveBeenCalledWith({
      show: false,
      title: expectedTitle,
      url: expectedUrl,
    });
    expect(win.toBrowserWindow()).toBe(BrowserWindow);

    const evt: ElectronEvent = {
      preventDefault: jest.fn(),
    } as Partial<ElectronEvent> as any;

    type PageTitleEventHandler = (evt: ElectronEvent) => void;
    // the 1st entry (0th index) in calls is the "page-title-updated" event
    // so this fires the event, and ensures that is is prevented
    const pageTitleEvent = BrowserWindow.on.mock.calls[0][1];
    const emitPageTitleUpdated = pageTitleEvent as unknown as PageTitleEventHandler;
    emitPageTitleUpdated(evt);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);
  });
});
