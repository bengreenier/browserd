import { Input } from "../../browser/input";

describe("Input", () => {
  const sendInputMock: jest.Mock = jest.fn();
  let instance: Input;
  beforeEach(() => {
    instance = new Input({
      sendInputEvent: sendInputMock,
    } as any);

    sendInputMock.mockClear();
  });

  it("should handle keyboard events", async () => {
    const sendInputCalled = new Promise((resolve) => {
      sendInputMock.mockImplementationOnce(() => {
        resolve();
      });
    });

    instance.processAndRaiseMessage({
      data: {
        key: "A",
        state: "pressed",
      },
      type: "keyboard",
      version: 1,
    });

    await sendInputCalled;
    expect(sendInputMock).toHaveBeenCalledTimes(1);
    expect(sendInputMock).toHaveBeenCalledWith({
      keyCode: "A",
      modifiers: [
        "Shift",
      ],
      type: "char",
    });
  });

  it("should ignore character key releases", () => {
    instance.processAndRaiseMessage({
      data: {
        key: "A",
        state: "released",
      },
      type: "keyboard",
      version: 1,
    });

    expect(sendInputMock).toHaveBeenCalledTimes(0);
  });

  it("should support f1", async () => {
    const sendInputCalled = new Promise((resolve) => {
      sendInputMock.mockImplementationOnce(() => {
        resolve();
      });
    });

    instance.processAndRaiseMessage({
      data: {
        key: "F1",
        state: "pressed",
      },
      type: "keyboard",
      version: 1,
    });

    await sendInputCalled;
    expect(sendInputMock).toHaveBeenCalledTimes(1);
    expect(sendInputMock).toHaveBeenCalledWith({
      keyCode: "F1",
      modifiers: [],
      type: "keyDown",
    });
  });

  it("should support shift", async () => {
    const sendInputCalled = new Promise((resolve) => {
      sendInputMock.mockImplementationOnce(() => {
        resolve();
      });
    });

    instance.processAndRaiseMessage({
      data: {
        key: "Shift",
        state: "pressed",
      },
      type: "keyboard",
      version: 1,
    });

    await sendInputCalled;
    expect(sendInputMock).toHaveBeenCalledTimes(1);
    expect(sendInputMock).toHaveBeenCalledWith({
      keyCode: undefined,
      modifiers: [
        "Shift",
      ],
      type: "keyDown",
    });
  });

  it("should support mouse down", async () => {
    const sendInputCalled = new Promise((resolve) => {
      sendInputMock.mockImplementationOnce(() => {
        resolve();
      });
    });

    instance.processAndRaiseMessage({
      data: {
        pointers: [
          {
            id: "1",
            state: "start",
            x: 10,
            y: 10,
          },
        ],
      },
      type: "touch",
      version: 1,
    });

    await sendInputCalled;
    expect(sendInputMock).toHaveBeenCalledTimes(1);
    expect(sendInputMock).toHaveBeenCalledWith({
      button: "left",
      clickCount: 1,
      type: "mouseDown",
      x: 10,
      y: 10,
    });
  });

  it("should support mouse up", async () => {
    const sendInputCalled = new Promise((resolve) => {
      sendInputMock.mockImplementationOnce(() => {
        resolve();
      });
    });

    instance.processAndRaiseMessage({
      data: {
        pointers: [
          {
            id: "1",
            state: "end",
            x: 10,
            y: 10,
          },
        ],
      },
      type: "touch",
      version: 1,
    });

    await sendInputCalled;
    expect(sendInputMock).toHaveBeenCalledTimes(1);
    expect(sendInputMock).toHaveBeenCalledWith({
      button: "left",
      clickCount: 1,
      type: "mouseUp",
      x: 10,
      y: 10,
    });
  });
});
