import { BrowserWindow as ElectronBrowserWindow } from "electron";
import { IWindow } from "../base/window-provider";

/**
 * Browser window wrapper
 */
export class BrowserWindow implements IWindow {
  private instance: ElectronBrowserWindow;

  /**
   * Default ctor
   * @param bw native browser window
   */
  public constructor(bw: ElectronBrowserWindow) {
    this.instance = bw;
  }

  public toBrowserWindow() {
    return this.instance;
  }

  public show() {
    this.instance.show();
  }

  public hide() {
    this.instance.hide();
  }
}
