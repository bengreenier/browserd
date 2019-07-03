import {
  BrowserWindow as ElectronBrowserWindow,
  Event as ElectronEvent,
  Session as ElectronSession,
  WebContents as ElectronWebContents,
} from "electron";
import pino from "pino";
import { Win } from "../../node/win";

jest.mock("pino");

const Session: jest.Mocked<ElectronSession> = {
  on: jest.fn(),
} as Partial<ElectronWebContents> as any;

const WebContents: jest.Mocked<ElectronWebContents> = {
  loadURL: jest.fn(),
  on: jest.fn(),
  session: Session,
} as Partial<ElectronWebContents> as any;

const BrowserWindow: jest.Mocked<ElectronBrowserWindow> = {
  loadURL: jest.fn().mockImplementation(() => Promise.resolve()),
  on: jest.fn(),
  once: jest.fn().mockImplementation((_, cb) => {
    cb();
  }),
  show: jest.fn(),
  webContents: WebContents,
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
    const logger = pino();

    const win = await instance.createWindow({
      logger,
      title: expectedTitle,
      url: expectedUrl,
    });

    expect(ElectronBrowserWindow).toHaveBeenCalledTimes(1);
    expect(ElectronBrowserWindow).toHaveBeenCalledWith({
      logger,
      show: false,
      title: expectedTitle,
      url: expectedUrl,
    });
    expect(win.toBrowserWindow()).toBe(BrowserWindow);

    const evt: ElectronEvent = {
      preventDefault: jest.fn(),
    } as Partial<ElectronEvent> as any;
    const webContents = BrowserWindow.webContents as jest.Mocked<ElectronWebContents>;
    const session = BrowserWindow.webContents.session as jest.Mocked<ElectronSession>;

    // BrowserWindow events
    type PageTitleEventHandler = (evt: ElectronEvent) => void;

    // the 1st entry (0th index) in calls is the "page-title-updated" event
    // so this fires the event, and ensures that is is prevented
    const pageTitleEvent = BrowserWindow.on.mock.calls[0][1];
    const emitPageTitleUpdated = pageTitleEvent as unknown as PageTitleEventHandler;
    emitPageTitleUpdated(evt);
    expect(evt.preventDefault).toHaveBeenCalledTimes(1);

    // BrowserWindow.webContents events
    type DidStartNavigationEventHandler = (evt: ElectronEvent, url: string) => void;
    type NewWindowEventHandler = (evt: ElectronEvent) => void;
    type WillNavigateEventHandler = (evt: ElectronEvent, url: string) => void;

    // the 1st entry in calls is the "did-start-navigation" event
    // so this fires the event, and ensures that the warning logs
    // is displayed properly
    const didStartNavigationEvent = webContents.on.mock.calls[0][1];
    const emitDidStartNavigationEvent = didStartNavigationEvent as unknown as DidStartNavigationEventHandler;

    // should not warn
    emitDidStartNavigationEvent(evt, "https://test.com");
    expect(logger.warn).toHaveBeenCalledTimes(0);

    // should warn for insecure http protocol
    emitDidStartNavigationEvent(evt, "http://test.com");
    expect(logger.warn).toHaveBeenCalledTimes(1);

    // should warn for navigating to a different origin
    emitDidStartNavigationEvent(evt, "https://test2.com");
    expect(logger.warn).toHaveBeenCalledTimes(2);

    // the 2nd entry in calls is the "new-window" event
    // so this fires the event, and ensures that is is prevented
    const newWindowEvent = webContents.on.mock.calls[1][1];
    const emitNewWindowEvent = newWindowEvent as unknown as NewWindowEventHandler;
    emitNewWindowEvent(evt);
    expect(evt.preventDefault).toHaveBeenCalledTimes(2);

    // the 3rd entry in calls is the "will-navigate" event
    // so this fires the event, and ensures that is is prevented
    const willNavigateEvent = webContents.on.mock.calls[2][1];
    const emitWillNavigateEvent = willNavigateEvent as unknown as WillNavigateEventHandler;

    // should not block
    emitWillNavigateEvent(evt, "http://test.com/test.txt");
    expect(evt.preventDefault).toHaveBeenCalledTimes(2);

    // should block executing javascript file
    emitWillNavigateEvent(evt, "http://test.com/test.js");
    expect(evt.preventDefault).toHaveBeenCalledTimes(3);

    // BrowserWindow.webContents.session events
    type WillDownloadEventHandler = (evt: ElectronEvent) => void;

    // the 1st entry in calls is the "will-download" event
    // so this fires the event, and ensures that is is prevented
    const willDownloadEvent = session.on.mock.calls[0][1];
    const emitWillDownloadEvent = willDownloadEvent as unknown as WillDownloadEventHandler;
    emitWillDownloadEvent(evt);
    expect(evt.preventDefault).toHaveBeenCalledTimes(4);
  });
});
