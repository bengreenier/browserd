import { BrowserWindow as ElectronBrowserWindow } from "electron";
import pino from "pino";
import { IWindowConstructorOpts, IWindowProvider } from "../base/window-provider";
import { BrowserWindow } from "./browser-window";

/**
 * Electron BrowserWindow provider
 */
export class Win implements IWindowProvider {
  public async createWindow(opts: IWindowConstructorOpts) {
    const logger = pino();
    const originalURL = new URL(opts.url);
    const win = new BrowserWindow(new ElectronBrowserWindow({
      ...opts,
      show: false,
    }));

    // internally, we need to use the raw version
    const rawWin = win.toBrowserWindow();

    rawWin.on("page-title-updated", (e) => {
      if (opts && opts.title) {
        e.preventDefault();
      }
    });

    rawWin.webContents.on("did-start-navigation", (_, url) => {
      const newURL = new URL(url);

      // warn about using insecure HTTP connections
      if (newURL.protocol === "http:") {
        logger.warn("Using HTTP as the transport: " + url);
      }

      // warn about navigating to different origins
      if (newURL.hostname && newURL.hostname !== originalURL.hostname) {
        logger.warn("Navigating to a different origin: " + newURL.hostname);
      }
    });

    // block middle-clicking, which opens a new window
    rawWin.webContents.on("new-window", (e) => {
      e.preventDefault();
    });

    // disable executing javascript files
    rawWin.webContents.on("will-navigate", (e, url) => {
      const newURL = new URL(url);
      if (newURL.pathname.endsWith(".js")) {
        e.preventDefault();
      }
    });

    // disable downloading files
    rawWin.webContents.session.on("will-download", (e) => {
      e.preventDefault();
    });

    const windowShown = new Promise((resolve) => {
      rawWin.once("ready-to-show", () => {
        rawWin.show();
        resolve();
      });
    });

    await Promise.all([windowShown, rawWin.loadURL(opts.url)]);

    // externally, we expose the wrapped window type
    return win;
  }
}
