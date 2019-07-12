/**
 * An input message
 */
export interface IInputMessage {
  /**
   * The message type
   */
  type: string;

  /**
   * The message version
   */
  version: number;

  /**
   * The message data
   */
  data: any;
}

/**
 * Base input handler
 */
export interface IInputHandler {
  /**
   * Process and raise input messages
   * @param msg incoming input message
   */
  processAndRaiseMessage(msg: IInputMessage): void;
}
