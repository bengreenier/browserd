import { EventEmitter } from "events";

/**
 * Represents the different types of input messages
 */
export enum MessageTypes {
  /**
   * Indicates message is of the {ITouchMessage} type
   */
  touch = "touch",
}

/**
 * Base class for all input messages
 */
export interface IInputMessage<TData> {
  /**
   * The message type
   * Note: typing syntax is ugly, see https://github.com/Microsoft/TypeScript/issues/14106
   */
  type: keyof typeof MessageTypes;

  /**
   * The message data (contents)
   */
  data: TData;

  /**
   * The version number
   * Note: currently supported values are as follows: 1
   */
  version: number;
}

/**
 * Represents the different touch states for an {ITouchMessage}
 */
export enum TouchState {
  /**
   * Indicates the start of a touch event
   */
  Start = "start",

  /**
   * Indicates the end of a touch event
   */
  End = "end",

  /**
   * Indicates touch movement (as a touch event)
   */
  Move = "move",
}

/**
 * Represents the data for an {ITouchMessage}
 */
export interface IPointerData {
  id: number;
  x: number;
  y: number;
  z: number;
  state: TouchState;
}

/**
 * The {ITouchMessage} - a touch representation of an {IInputMessage}
 */
export type ITouchMessage = IInputMessage<{ pointers: IPointerData[] }>;

/**
 * Html input events used by {InputMonitor}
 */
export enum HtmlInputEvents {
  /**
   * Event that occurs when the mouse is down
   */
  Mousedown = "mousedown",

  /**
   * Event that occurs when the mouse is released
   */
  Mouseup = "mouseup",
}

/**
 * Input monitor to observe and emit input events on a given {HtmlVideoElement}
 * Note: Supported events are "mousedown", "mouseup"
 */
export class InputMonitor extends EventEmitter {
  constructor(video: HTMLElement) {
    super();

    video.addEventListener(HtmlInputEvents.Mousedown, (e) => {
      this.generateAndEmitMouse(video, e, TouchState.Start, HtmlInputEvents.Mousedown);
    });

    video.addEventListener(HtmlInputEvents.Mouseup, (e) => {
      this.generateAndEmitMouse(video, e, TouchState.End, HtmlInputEvents.Mouseup);
    });
  }

  /**
   * Generates and emits a mouse event (using the correct {IInputMessage} format)
   * @param video the html video element
   * @param e the mouse event
   * @param state the corresponding state
   * @param type the corresponding type
   */
  private generateAndEmitMouse(video: HTMLElement, e: MouseEvent, state: TouchState, type: string) {
    const { top, left } = video.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    const msg: ITouchMessage = {
      data: {
        pointers: [
          {
            id: 1,
            state,
            x: x - left,
            y: y - top,
            z: 0,
          },
        ],
      },
      type: MessageTypes.touch,
      version: 1,
    };

    this.emit(type, msg);
  }
}
