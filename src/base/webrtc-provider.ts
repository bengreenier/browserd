import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import { IStream } from "./stream-provider";

/**
 * Possible event definitions for the webrtc provider
 */
interface IWebrtcProviderEvents {
  /**
   * Emitted when an error occurs
   */
  error: (err: any) => void;

  /**
   * Emitted when we connect on an rtc level
   */
  connect: () => void;

  /**
   * Emitted when we disconnect on an rtc level
   */
  disconnect: () => void;

  /**
   * Emitted when signal data is prepared for transmission
   */
  signal: (data: any) => void;

  /**
   * Emitted when webrtc peer-sent data has arrived
   */
  data: (data: any) => void;
}

/**
 * The strongly-typed webrtc emitter type that we'll extend for our provider
 */
type WebrtcEmitter = StrictEventEmitter<EventEmitter, IWebrtcProviderEvents>;

/**
 * The base webrtc provider type
 */
export abstract class IWebrtcProvider extends (EventEmitter as new() => WebrtcEmitter) {
  /**
   * Initialize the provider for use
   * Note: multiple calls are not permitted without first calling {destroy()}
   * @param iceServers the ice servers to use for communication
   * @param stream the stream we transmit
   */
  public abstract initialize(iceServers: RTCIceServer[], stream: IStream): void;

  /**
   * Process and internalize some signal input, received from the signaling provider
   * @param data signal data
   */
  public abstract signal(data: any): void;

  /**
   * Destroy this instance of a webrtc provider
   */
  public abstract destroy(): void;
}
