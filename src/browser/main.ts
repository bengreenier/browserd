import { desktopCapturer, remote } from "electron";
import pino from "pino";
import {
  K_BROWSER_CONFIG,
  K_BROWSER_STORAGE,
  K_CAPTURE_WIN,
  K_PRELOAD_INIT_KEY,
  K_SIGNAL_CONFIG,
} from "../base/constants";
import { Application } from "./application";
import { H264Sdp } from "./h264-sdp";
import { Input } from "./input";
import { Peer } from "./peer";
import { Signal } from "./signal";
import { UserMedia } from "./usermedia";

// we'll export this and use it for testing
// it won't impact the runtime as the runtime ignores it
let runtimeIgnoredExportValue: Promise<void>;

const logger = pino();
const config = remote.getGlobal(K_BROWSER_STORAGE);

if (!config[K_PRELOAD_INIT_KEY]) {
  // indicate that we've booted, and future preloads should not boot again
  config[K_PRELOAD_INIT_KEY] = true;

  const captureWindowTitle = config[K_CAPTURE_WIN];
  const captureWindow = remote.BrowserWindow
    .getAllWindows()
    .find((w) => w.getTitle() === captureWindowTitle);

  if (captureWindow) {
    const app = new Application({
      ...config[K_BROWSER_CONFIG],
      captureWindowTitle,
      inputHandler: new Input(captureWindow.webContents),
      logger,
      signalProvider: new Signal({
        ...config[K_SIGNAL_CONFIG],
      }),
      streamProvider: new UserMedia({
        getSources: desktopCapturer.getSources,
        // bind needed - see https://github.com/peers/peerjs/issues/98#issuecomment-445342890
        getUserMedia: navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices),
      }),
      webrtcProvider: new Peer({
        sdpHandler: new H264Sdp(),
      }),
    });

    runtimeIgnoredExportValue = app.boot().then(() => {
      logger.info("Browser: booted");
    }, (err) => {
      logger.error(`Browser: failed to boot: ${err}`);
    });
  } else {
    const errorText = "Browser: could not find capture window";
    logger.error(errorText, captureWindowTitle);
    runtimeIgnoredExportValue = Promise.reject(errorText);
  }
} else {
  const errorText = "Browser: could not re-boot";
  logger.error(errorText);
  runtimeIgnoredExportValue = Promise.reject(errorText);
}

module.exports = runtimeIgnoredExportValue;
