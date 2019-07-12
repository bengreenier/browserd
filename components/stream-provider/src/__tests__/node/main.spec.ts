import { Application as NodeApplication } from "../../node/application";

(process.exit as any) = jest.fn();
process.env = {
  EXP_HIDE_STREAMER: "false",
  HEIGHT: "10",
  POLL_INTERVAL: "10",
  POLL_URL: "http://url.com",
  SERVICE_URL: "http://url.com",
  WIDTH: "10",
};

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
