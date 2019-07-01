import { Application as NodeApplication } from "../../node/application";

(process.exit as any) = jest.fn();

jest.mock("electron", () => {
  return {
    app: {
      on: jest.fn().mockImplementation((_, cb: () => void) => {
        // invoke "ready" right away
        cb();
      }),
    },
  };
});

const Application: jest.Mocked<NodeApplication> = {
  boot: jest.fn().mockImplementation(() => Promise.resolve()),
} as Partial<NodeApplication> as any;

jest.mock("../../node/application", () => {
  return {
    Application: jest.fn().mockImplementation(() => {
      return Application;
    }),
  };
});

describe("main.node", () => {
  // TODO(bengreenier): make this test (and it's mocks) more robust
  it("should eval", async () => {
    const runtimeExportValue = require("../../node/main");

    await runtimeExportValue;

    expect(Application.boot).toHaveBeenCalledTimes(1);
  });
});
