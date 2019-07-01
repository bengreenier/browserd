import { BrowserWindow as ElectronBrowserWindow } from "electron";
import { IWindowConstructorOpts, IWindowProvider } from "../base/window-provider";
import { BrowserWindow } from "./browser-window";

/**
 * Electron BrowserWindow provider
 */
export class Win implements IWindowProvider {
  public async createWindow(opts: IWindowConstructorOpts) {
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
