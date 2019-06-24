import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";

/**
 * Represents a signal peer
 */
export interface ISignalPeer {
  /**
   * Boolean indicating if the peer is connected
   */
  connected: boolean;

  /**
   * Id of the peer
   */
  id: string;

  /**
   * Name of the peer (visual only)
   */
  name: string;
}

/**
 * Possible event definitions for the signal provider
 */
interface ISignalProviderEvents {
  /**
   * Emitted when a peer is added or removed to the server
   */
  "peer-update": (peers: ISignalPeer[]) => void;

  /**
   * Emitted when a peer sends us a message
   */
  "peer-message": (msg: string, id: string) => void;

  /**
   * Emitted when an error occurs
   */
  error: (err: any) => void;
}

/**
 * The strongly-typed signal emitter type that we'll extend for our signaler
 */
type SignalEmitter = StrictEventEmitter<EventEmitter, ISignalProviderEvents>;

/**
 * The base signal provider type
 */
export abstract class ISignalProvider extends (EventEmitter as new() => SignalEmitter) {
  /**
   * The assigned peer id from the remote signal provider
   */
  public abstract readonly id?: string;

  /**
   * Sign in to the remote signal provider
   * @param peerName the peer name to identify visually as
   * @returns list of all other connected remote peers
   */
  public abstract signIn(peerName: string): Promise<ISignalPeer[]>;

  /**
   * Send arbitrary data to a remote peer via the signal provider
   * @param data the data to send
   * @param peerId the peer to send to
   */
  public abstract send(data: string, peerId: string): Promise<void>;

  /**
   * Sign out of the remote signal provider
   */
  public abstract signOut(): Promise<void>;

  /**
   * Destroy this instance of a signal provider
   */
  public abstract destroy(): void;
}
