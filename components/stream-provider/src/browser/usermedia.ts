import { DesktopCapturerSource, SourcesOptions } from "electron";
import { IDeviceInfo, IStreamProvider } from "../base/stream-provider";
import { BrowserMediaStream } from "./browser-media-stream";

/**
 * UserMedia constructor options
 */
export interface IUserMediaOpts {
  /**
   * Browser-provided getSources API
   * ex: https://electronjs.org/docs/api/desktop-capturer#desktopcapturergetsourcesoptions-callback
   */
  getSources: (opts: SourcesOptions, cb: (err: Error, sources: DesktopCapturerSource[]) => void) => void;

  /**
   * Browser-provided getUserMedia API
   * ex: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
   */
  getUserMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream>;
}

/**
 * Providers a browser usermedia stream
 */
export class UserMedia implements IStreamProvider {
  private opts: IUserMediaOpts;

  /**
   * Default ctor
   * @param opts ctor opts
   */
  constructor(opts: IUserMediaOpts) {
    this.opts = opts;
  }

  public async enumerateDevices(filter?: (device: IDeviceInfo) => boolean) {
    const sources = await this.getSourcesAsync();
    return sources.map((source) => {
      return {
        id: source.id,
        name: source.name,
      } as IDeviceInfo;
    }).filter((e) => filter ? filter(e) : true);
  }

  public async createStream(device: IDeviceInfo) {
    const media = await this.opts.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: device.id,
        },
      },
    } as any);

    return new BrowserMediaStream(media);
  }

  /**
   * Internal helper - get sources from the bound electron API
   */
  private getSourcesAsync() {
    return new Promise<DesktopCapturerSource[]>((resolve, reject) => {
      this.opts.getSources({
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
  }
}
