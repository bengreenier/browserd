import { parse as hiddenParseSdp, write as hiddenWriteSdp } from "sdp-transform";
import { H264Sdp } from "../../browser/h264-sdp";

const parseSdp = hiddenParseSdp as jest.Mock;
const writeSdp = hiddenWriteSdp as jest.Mock;

jest.mock("sdp-transform");

describe("H264Sdp", () => {
  const instance = new H264Sdp();
  const validSdp = {
    media: [
      {
        payloads: "234 123",
        rtp: [
          {
            codec: "H264",
            payload: "123",
          },
        ],
        type: "video",
      },
    ],
  };
  const validSdpReordered = {
    media: [
      {
        payloads: "123 234",
        rtp: validSdp.media[0].rtp,
        type: validSdp.media[0].type,
      },
    ],
  };
  const invalidSdp = {
    media: [
      {
        rtp: validSdp.media[0].rtp,
        type: validSdp.media[0].type,
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should reorder h264 to the front", () => {
    const expectedSerialization = "ser";
    parseSdp.mockImplementationOnce(() => {
      return validSdp;
    });
    writeSdp.mockImplementationOnce(() => {
      return expectedSerialization;
    });
    expect(instance.transformSdp("")).toBe(expectedSerialization);
    expect(parseSdp).toHaveBeenCalledTimes(1);
    expect(parseSdp).toHaveBeenCalledWith("");
    expect(writeSdp).toHaveBeenCalledTimes(1);
    expect(writeSdp).toHaveBeenCalledWith(validSdpReordered);
  });

  it("should throw if missing payloads", () => {
    const expectedSerialization = "ser";
    parseSdp.mockImplementationOnce(() => {
      return invalidSdp;
    });
    writeSdp.mockImplementationOnce(() => {
      return expectedSerialization;
    });
    expect(() => instance.transformSdp("")).toThrowError(/missing payloads/);
    expect(parseSdp).toHaveBeenCalledTimes(1);
    expect(parseSdp).toHaveBeenCalledWith("");
    expect(writeSdp).toHaveBeenCalledTimes(0);
  });
});
