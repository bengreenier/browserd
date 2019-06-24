/**
 * Base sdp handler/transformer
 */
export interface ISdpHandler {
  /**
   * transforms an sdp message
   * @param sdp a stringify-ed sdp message
   */
  transformSdp(sdp: string): string;
}
