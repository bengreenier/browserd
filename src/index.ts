import {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  DesktopCapturerSource,
  SourcesOptions,
  WebContents } from "electron";
import { parse as parseSdp, write as writeSdp } from "sdp-transform";
import { default as SimplePeer } from "simple-peer";

/**
 * Get all available desktop sources from electron
 * @param opts source enumeration options
 */
export const getDesktopSources = (opts?: SourcesOptions) => {
  const desktopCapturer = require("electron").desktopCapturer;
  return new Promise<DesktopCapturerSource[]>((resolve, reject) => {
    desktopCapturer.getSources({
      ...opts,
      types: [
        "screen",
        "window",
      ],
    }, (err, sources) => {
      if (err) {
        reject(err);
      } else {
        resolve(sources);
      }
    });
  });
};

/**
 * Selects the best-fit capture source
 * @param sources incoming sources
 * @param desiredWindowName desired name of window
 */
export const selectCaptureSource = (sources: DesktopCapturerSource[], desiredWindowName: string) => {
  let desiredSource = sources.find((source) => source.name === desiredWindowName);
  if (!desiredSource) {
    desiredSource = sources[0];
  }
  return desiredSource;
};

/**
 * An array type for rtp data
 */
export type rtpArray = Array<{ payload: number, codec: string, rate: number }>;

/**
 * Forces the sdp to prioritize h264
 * @param sdp some sdp object
 */
export const forceH264Sdp = (sdp: any) => {
  const obj = parseSdp(sdp);

  // find the video media lines
  obj.media = obj.media.map((media) => {
    // if it isn't video, pass through
    if (media.type !== "video") {
      return media;
    }
    // for each, iterate over the rtp array (note: typings is incorrect for chrome m73 - rtp is array)
    const rtpArr: rtpArray = media.rtp as any;

    // find all the h264 entries in the array
    const rtpH264 = rtpArr.filter((rtp) => rtp.codec === "H264");

    // assuming we found one...
    if (rtpH264.length > 0) {
      // take the first one's payload value (as a string)
      const h264 = rtpH264[0].payload.toString();

      if (!media.payloads) {
        throw new Error("missing payloads in sdp");
      }

      // take the media lines payload values, and remove the exact one
      // we found above - we're going to set it as the default
      const payloads = media.payloads
        .split(" ")
        .filter((payload) => payload !== h264);

      // make the exact one we found above re-added, as the first entry
      payloads.unshift(h264);

      // finally, save the payloads literal back to the media line
      media.payloads = payloads.join(" ");

      return media as any;
    }
  });

  // modify mLine to contain only h264 codec
  sdp = writeSdp(obj);

  return sdp;
};

/**
 * Creates a browser view, and resolves when it is ready
 * @param url default shown url
 * @param opts browser view options
 */
export const createWindow = (url: string, opts?: BrowserWindowConstructorOptions) => {
  return new Promise<BrowserWindow>((resolve, reject) => {
    try {
      const bw = new BrowserWindow({
        ...opts,
        show: false,
      });

      bw.on("page-title-updated", (e) => {
        if (opts && opts.title) {
          e.preventDefault();
        }
      });

      bw.once("ready-to-show", () => {
        bw.show();
        resolve(bw);
      });

      bw.loadURL(url);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Create a stream
 * @param source stream source
 * @param opts stream options
 */
export const createStream = (source: DesktopCapturerSource, opts?: MediaStreamConstraints) => {
  return navigator.mediaDevices.getUserMedia({
    ...opts,
    audio: {
      mandatory: {
        chromeMediaSource: "system",
        chromeMediaSourceId: source.id,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id,
      },
    },
  } as any);
};

/**
 * Creates a simple peer
 * @param opts simple peer options
 */
export const createPeer = (opts?: SimplePeer.Options) => {
  return new SimplePeer(opts);
};

/**
 * Represents a peer as parsed from signaling responses
 */
export interface IPeer {
  connected: boolean;
  id: string;
  name: string;
}

/**
 * Parse peers from a peer lst
 * @param src peer list as text
 */
export const parsePeers = (src: string): IPeer[] => {
  return src.split("\n")
    .filter((p) => typeof p !== "undefined" && p.length > 0)
    .map((p) => {
      const parts = p.split(",");
      if (parts.length !== 3) {
        throw new Error(`Invalid peer line: ${p}`);
      }
      return {
        connected: parts[2] === "1",
        id: parts[1],
        name: parts[0],
      };
    });
};

/**
 * Input event types
 */
export interface IInputEvent<TData = any> {
  type: string;
  version: number;
  data: TData;
}

/**
 * Fire some input event
 * @param win window to fire against
 * @param msg data to fire
 */
export const fireInputEvent = (win: WebContents, msg: IInputEvent) => {
  if (msg.version !== 1) {
    throw new Error(`Unsupported Input Protocol version: ${msg.version}`);
  }

  switch (msg.type) {
    // process touch events
    case "touch":
      const touchData = msg.data as { pointers: Array<{ id: string, state: string, x: number, y: number }> };

      // process each pointer individually
      touchData.pointers.forEach((pointer) => {
        switch (pointer.state) {
          // if the pointer is starting a touch
          case "start":
            // emit a left-click (hold down) at that location
            win.sendInputEvent({
              button: "left",
              clickCount: 1,
              type: "mouseDown",
              x: pointer.x,
              y: pointer.y,
            } as any);
            break;
          // if the pointer is releasing
          case "end":
            // emit a left-click (release) at that location
            win.sendInputEvent({
              button: "left",
              clickCount: 1,
              type: "mouseUp",
              x: pointer.x,
              y: pointer.y,
            } as any);
            break;
          default:
            throw new Error(`Unsupported Touch State: ${pointer.state} (for ${pointer.id})`);
        }
      });
      break;
    case "keyboard":
      const keyData = msg.data as { key: string, state: string };

      // these help us convert the message to electron accelerator message
      const modifiers = /^(Command|Cmd|Control|Ctrl|CommandOrControl|CmdOrCtrl|Alt|Option|AltGr|Shift|Super)$/;
      const keyCodes = /^([0-9A-Za-z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]'])$/;
      // tslint:disable-next-line:max-line-length
      const specialKeyCodes = /(F1*[1-9]|F10|F2[0-4]|Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen)$/;
      const lowerKeyCodes = /^[a-z]$/;

      // default initialize the key event
      const event: {
        keyCode?: string,
        modifiers: string[],
        type?: "keyUp" | "keyDown" | "char",
      } = {
        keyCode: undefined,
        modifiers: [],
        type: undefined,
      };

      // send keycodes as char
      if (keyCodes.test(keyData.key)) {
        // we only fire chars on "pressed"
        if (keyData.state !== "pressed") {
          break;
        }

        event.type = "char";
        event.keyCode = keyData.key;
        if (!lowerKeyCodes.test(keyData.key)) {
          event.modifiers.push("Shift");
        }
        // send special keys and modifiers as key events
      } else {
        // case the keycode, capital first, then lowercase
        const casedKeyCode = keyData.key[0].toUpperCase() + keyData.key.substr(1).toLowerCase();

        event.type = keyData.state === "pressed" ? "keyDown" : "keyUp";

        // special key codes must use cased keyCode properties
        if (specialKeyCodes.test(keyData.key)) {
          event.keyCode = casedKeyCode;
          // modifiers must use no keyCode prop, and a modifier array
        } else if (modifiers.test(keyData.key)) {
          event.keyCode = undefined;
          event.modifiers = [
            casedKeyCode,
          ];
        }
      }

      win.sendInputEvent(event as any);
      break;
    case "rotary":
      const rotaryData = msg.data as { key: string, state: string };

      // navigate to home selector screen when back button on rotary controller is pressed
      if (rotaryData.key === "back" && rotaryData.state === "pressed") {
        // go back to beginning of history
        win.goToIndex(0);
      }
      break;
    default:
      throw new Error(`Unsupported Message Type: ${msg.type}`);
  }
};

/**
 * Interface for the rpc shared object
 */
export interface ISharedObject {
  allowPreload: boolean;
  captureWindowTitle: string;
  iceServers: RTCIceServer[];
  pollInterval: number;
  pollUrl: string;
}

/**
 * The keyname of the global property in which we'll store our {ISharedObject}
 */
export const sharedObjectKeyName = "sharedObject";

/**
 * leverage the fetch implementation
 */
export const fetch = (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  // note: we must reference global, as just {fetch} will reference ourself, and cause
  // a circular reference issue (blows the stack)
  return (global as any).fetch(input, init);
};
