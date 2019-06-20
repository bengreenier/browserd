import { EventEmitter } from "events";
import StrictEventEmitter from "strict-event-emitter-types";
import * as url from "url";
import { fetch, IPeer, parsePeers } from ".";

/**
 * Signaler events
 */
interface ISignalEvents {
    /**
     * Emitted when a peer is added or removed to the server
     */
    "peer-update": (peers: IPeer[]) => void;

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
 * Signaler ctor options
 */
export interface ISignalOpts {
    /**
     * The signaling endpoint url
     */
    url: string;

    /**
     * The signaling poll interval
     */
    pollIntervalMs: number;
}

/**
 * The strongly-typed signal emitter type that we'll extend for our signaler
 */
type SignalEmitter = StrictEventEmitter<EventEmitter, ISignalEvents>;

/**
 * Http signaling server client
 */
export class Signal extends (EventEmitter as new() => SignalEmitter) {
    /**
     * The signaling address
     */
    public readonly url: string;

    /**
     * The signaling poll interval
     */
    public readonly pollInterval: number;

    private backingId?: string;
    private longpollIntervalId?: number;
    private longpollPending: boolean;

    /**
     * Default ctor
     * @param opts options
     */
    constructor(opts: ISignalOpts) {
        super();
        this.url = opts.url;
        this.pollInterval = opts.pollIntervalMs;
        this.longpollPending = false;
    }

    /**
     * Get the assigned id ({undefined} until after {signIn()})
     */
    public get id() { return this.backingId; }

    /**
     * Sign in to the signaler
     * @param peerName the peer name to register as
     * @param isProvider indicates if this peer is a service provider or consumer
     */
    public signIn(peerName: string, isProvider = true) {
        return fetch(url.resolve(this.url,
            `/sign_in?peer_name=${peerName}&is_stream_provider=${isProvider}`))
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Invalid Response: ${res.status}`);
                }

                if (!res.headers.has("Pragma")) {
                    throw new Error("Missing Pragma header");
                }

                this.backingId = res.headers.get("Pragma") as string;
                this.longpollIntervalId = setInterval(() => {
                    this.poll();
                }, this.pollInterval) as unknown as number;
                return res.text();
            })
            .then((txt) => {
                return parsePeers(txt);
            });
    }

    /**
     * Sign out of the signaler
     */
    public signOut() {
        return fetch(url.resolve(this.url, `/sign_out?peer_id=${this.id}`))
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Invalid Response: ${res.status}`);
                }

                this.destroy();
            });
    }

    /**
     * Send data to a remote peer
     * @param data data to send (stringify-ed)
     * @param peerId remote peer id to send to
     */
    public send(data: string, peerId: string) {
        return fetch(url.resolve(this.url, `/message?peer_id=${this.id}&to=${peerId}`), {
            body: data,
            method: "POST",
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error(`Invalid Response: ${res.status}`);
            }
        });
    }

    /**
     * Cleanup internals and destroy the signal instance
     */
    public destroy() {
        if (this.id) {
            this.backingId = undefined;
        }
        if (this.longpollIntervalId) {
            clearInterval(this.longpollIntervalId);
            this.longpollIntervalId = undefined;
        }
        this.longpollPending = false;
    }

    /**
     * Interval polling helper
     */
    private poll() {
        if (this.longpollPending) {
            return;
        }

        this.longpollPending = true;

        fetch(url.resolve(this.url, `/wait?peer_id=${this.id}`))
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Invalid Response: ${res.status}`);
                }

                if (!res.headers.has("Pragma")) {
                    throw new Error("Missing Pragma header");
                }

                return res.text().then((txt) => ({
                    pragma: res.headers.get("Pragma") as string,
                    txt,
                }));
            })
            .then((wrapped) => {
                if (wrapped.pragma === this.id) {
                    this.emit("peer-update", parsePeers(wrapped.txt));
                } else {
                    this.emit("peer-message", wrapped.txt, wrapped.pragma);
                }

                this.longpollPending = false;
            }, (err) => {
                this.emit("error", err);
            });
    }
}
