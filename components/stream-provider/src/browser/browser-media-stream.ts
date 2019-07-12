import { IStream } from "../base/stream-provider";

/**
 * A browser media stream
 * Note: wrapper around {MediaStream}
 */
export class BrowserMediaStream implements IStream {
  private stream: MediaStream;

  /**
   * Default ctor
   * @param stream the backing media stream
   */
  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  public toMediaStream(): MediaStream {
    return this.stream;
  }
}
