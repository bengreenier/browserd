import { BrowserMediaStream } from "../../browser/browser-media-stream";

describe("BrowserMediaStream", () => {
  it("should be a thin wrapper", () => {
    const expected: MediaStream = {
      isTestStream: true,
    } as any;

    const instance = new BrowserMediaStream(expected);
    expect(instance.toMediaStream()).toBe(expected);
  });
});
