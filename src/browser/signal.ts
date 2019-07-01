import * as url from "url";
import { ISignalPeer, BaseSignalProvider } from "../base/signal-provider";

/**
 * Signal constructor options
 */
export interface ISignalOpts {
  /**
   * The url to poll
   */
  url: string;

  /**
   * The interval to poll at
   */
  pollIntervalMs: number;
}

/**
 * Http signaling server client
 * Note: speaks the protocol defined @ https://github.com/bengreenier/webrtc-signal-http
 */
export class Signal extends BaseSignalProvider {
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

  public get id() { return this.backingId; }

  public signIn(peerName: string) {
    return fetch(url.resolve(this.url,
      `/sign_in?peer_name=${peerName}`))
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
        return this.parsePeers(txt);
      });
  }

  public signOut() {
    return fetch(url.resolve(this.url, `/sign_out?peer_id=${this.id}`))
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Invalid Response: ${res.status}`);
        }

        this.destroy();
      });
  }

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
          this.emit("peer-update", this.parsePeers(wrapped.txt));
        } else {
          this.emit("peer-message", wrapped.txt, wrapped.pragma);
        }

        this.longpollPending = false;
      }, (err) => {
        this.emit("error", err);
      });
  }

  /**
   * Parses peers from a peer list
   * @param txt source peers list text
   */
  private parsePeers(txt: string): ISignalPeer[] {
    return txt.split("\n")
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
  }
}
