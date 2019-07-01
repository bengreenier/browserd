import * as path from "path";
import { Logger } from "pino";
import { IApplication } from "../base/application";
import {
  K_BROWSER_CONFIG,
  K_BROWSER_STORAGE,
  K_CAPTURE_WIN,
  K_PRELOAD_LOGGER_KEY,
  K_SIGNAL_CONFIG,
} from "../base/constants";
import { IWindowProvider } from "../base/window-provider";
import { ISignalOpts } from "../browser/signal";

/**
 * Application constructor options
 */
interface IApplicationOpts {
  /**
   * A logger
   */
  logger: Logger;

  /**
   * The url to stream (visually)
   */
  url: string;

  /**
   * The visual window width
   */
  width: number;

  /**
   * The visual window height
   */
  height: number;

  /**
   * The capture window name
   */
  captureWindowTitle: string;

  /**
   * Signal configuration
   */
  signalConfig: ISignalOpts;

  /**
   * Streamer (browser/application) configuration
   */
  streamerConfig: { iceServers: RTCIceServer[] };

  /**
   * Experiment: hide the streamer window
   */
  expHideStreamer: boolean;

  /**
   * A window provider
   */
  winProvider: IWindowProvider;
}

/**
 * Node application - orchestrates electron main process
 */
export class Application implements IApplication {
  private opts: IApplicationOpts;

  /**
   * Default Ctor
   * @param opts ctor opts
   */
  constructor(opts: IApplicationOpts) {
    this.opts = opts;
  }

  /**
   * Internal boot up helper
   */
  public async boot() {
    const {
      logger,
      url,
      captureWindowTitle,
      signalConfig,
      streamerConfig,
      expHideStreamer,
      winProvider,
      width,
      height } = this.opts;

    logger.info("Node: creating browser");

    await winProvider.createWindow({
      alwaysOnTop: true,
      backgroundColor: "#000",
      height,
      title: captureWindowTitle,
      url,
      width,
    });

    logger.info("Node: created browser");

    // give our content window another second - to be sure x is happy
    await new Promise((resolve) => setTimeout(() => resolve(), 1000));

    // setup our globals so the streamer-process can access it's config
    this.setGlobals({
      captureWindowTitle,
      logger,
      signalConfig,
      streamerConfig,
    });

    logger.info("Node: creating streamer");

    const streamerWindow = await winProvider.createWindow({
      height: 10,
      url: "chrome://webrtc-internals",
      webPreferences: {
        // this is what triggers our actual streamer logic (webrtc init and whatnot)
        preload: path.join(__dirname, "/../browser/main.js"),
      },
      width: 10,
    });

    logger.info("Node: created streamer");

    // if we're running the hide_streamer flight, hide it
    if (expHideStreamer) {
      streamerWindow.hide();
      logger.info("Node: experiment - hiding streamer window");
    }
  }

  /**
   * Set globals
   * @param opts the global values
   */
  private setGlobals({
    captureWindowTitle,
    logger,
    signalConfig,
    streamerConfig,
  }: Partial<IApplicationOpts>) {
    const glob: { [key: string]: any } = {};
    glob[K_CAPTURE_WIN] = captureWindowTitle;
    glob[K_PRELOAD_LOGGER_KEY] = logger;
    glob[K_BROWSER_CONFIG] = streamerConfig;
    glob[K_SIGNAL_CONFIG] = signalConfig;
    (global as any)[K_BROWSER_STORAGE] = glob;
  }
}
