import { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import { Logger } from "pino";

/**
 * Window construction options
 */
export interface IWindowConstructorOpts extends Partial<BrowserWindowConstructorOptions> {
  /**
   * A logger
   */
  logger: Logger;

  /**
   * The url of the page to load
   */
  url: string;
}

/**
 * Representation of a window
 */
export interface IWindow {
  /**
   * Convert a window to it's native type
   */
  toBrowserWindow(): BrowserWindow;

  /**
   * Show the window
   */
  show(): void;

  /**
   * Hide the window
   */
  hide(): void;
}

/**
 * Base window provider
 */
export interface IWindowProvider {
  /**
   * Create a window
   * @param opts window construction options
   */
  createWindow(opts: IWindowConstructorOpts): Promise<IWindow>;
}
