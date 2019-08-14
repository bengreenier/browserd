import { EventEmitter } from "events";
import {
  HtmlInputEvents,
  InputMonitor,
  MessageTypes,
  TouchState
} from "../input";

describe("input", () => {
  describe("InputMonitor", () => {
    /**
     * Generates a mock video element (as any) that meets the needs of {InputMonitor}
     */
    const generateVideoElement = () => {
      const ee = new EventEmitter();
      (ee as any).addEventListener = jest.fn().mockImplementation((evt, handler) => {
        ee.addListener(evt, handler);
      });
      (ee as any).getBoundingClientRect = jest.fn().mockImplementation(() => ({ top: 100, left: 100 }));

      return ee as any;
    };

    it("should monitor mouse input", () => {
      const mock = generateVideoElement();
      const instance = new InputMonitor(mock);
      const spy = jest.spyOn(instance, "emit");

      mock.emit(HtmlInputEvents.Mousedown, { clientX: 150, clientY: 150 });

      // since the video element has {top: 100, left: 100}
      // a click at 150, 150 in screen space should be sent over the wire
      // at a coordinate of {x: 50, y: 50} in what we might call "element space"
      expect(spy).toHaveBeenCalledWith(HtmlInputEvents.Mousedown, {
        data: {
          pointers: [
            {
              id: 1,
              state: TouchState.Start,
              x: 50,
              y: 50,
              z: 0,
            },
          ],
        },
        type: MessageTypes.touch,
        version: 1,
      });
    });
  });
});
