import SimplePeer from "simple-peer";
import { ISdpHandler } from "../base/sdp-handler";
import { IStream } from "../base/stream-provider";
import { BaseWebrtcProvider } from "../base/webrtc-provider";

/**
 * Peer constructor options
 */
export interface IPeerOpts {
  /**
   * The sdp handler
   */
  sdpHandler: ISdpHandler;
}

/**
 * A peer webrtc provider
 */
export class Peer extends BaseWebrtcProvider {
  private instance?: SimplePeer.Instance;
  private sdpHandler: ISdpHandler;

  /**
   * Default ctor
   * @param opts ctor opts
   */
  public constructor(opts: IPeerOpts) {
    super();

    this.sdpHandler = opts.sdpHandler;
  }

  public initialize(iceServers: RTCIceServer[], stream: IStream) {
    if (this.instance) {
      throw new Error("Already initialized");
    }

    // as SimplePeer needs <any> transformers, we must do that mapping
    // for it
    const anyTransformer = (sdp: any) => {
      return this.sdpHandler.transformSdp(sdp) as any;
    };

    this.instance = new SimplePeer({
      config: {
        iceServers,
      },
      initiator: false,
      sdpTransform: anyTransformer,
      stream: stream.toMediaStream(),
    });

    this.instance.on("error", (err) => this.emit("error", err));
    this.instance.on("connect", () => this.emit("connect"));
    this.instance.on("close", () => this.emit("disconnect"));
    this.instance.on("signal", (data) => this.emit("signal", data));
    this.instance.on("data", (data) => this.emit("data", data));
  }

  public signal(data: any) {
    if (this.instance) {
      this.instance.signal(data);
    }
  }

  public destroy() {
    if (this.instance) {
      this.instance.destroy();
      this.instance = undefined;
    }
  }
}
