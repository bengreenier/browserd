import {
  DesktopCapturer,
  desktopCapturer as hiddenDesktopCapturer,
  DesktopCapturerSource,
} from "electron";
import { parse as hiddenParseSdp, write as hiddenWriteSdp } from "sdp-transform";
import {
  forceH264Sdp,
  getDesktopSources,
  parsePeers,
  selectCaptureSource,
} from "..";

const desktopCapturer = hiddenDesktopCapturer as jest.Mocked<DesktopCapturer>;
const parseSdp = hiddenParseSdp as jest.Mock;
const writeSdp = hiddenWriteSdp as jest.Mock;

jest.mock("electron");
jest.mock("sdp-transform");
jest.mock("simple-peer");

/**
 * Helper for mocking callback-apis
 * @param err error
 * @param res result
 */
const cbify: <TErr, TRes>(err: TErr, res: TRes) => any = (err, res) => {
  return (_: any, cb: any) => {
    return cb(err, res);
  };
};

describe("index (helpers)", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("getDesktopSources", () => {
    it("should return sources", async () => {
      const expectedSources: DesktopCapturerSource[] = [
        {
          appIcon: null as any,
          display_id: "1",
          id: "source",
          name: "source name",
          thumbnail: null as any,
        },
      ];
      desktopCapturer
        .getSources
        .mockImplementationOnce(cbify(undefined, expectedSources));

      expect(await getDesktopSources()).toEqual(expectedSources);
      expect(desktopCapturer.getSources).toHaveBeenCalledTimes(1);
      expect(desktopCapturer.getSources.mock.calls[0][0]).toEqual({
        types: ["screen", "window"],
      });
    });

    it("should reject on failure", async () => {
      desktopCapturer.getSources.mockImplementationOnce(cbify(new Error("failure"), undefined));

      await expect(getDesktopSources()).rejects.toBeInstanceOf(Error);
    });
  });

  describe("selectCaptureSource", () => {
    const validWindowName = "source name";
    const validMockSources: DesktopCapturerSource[] = [
      {
        appIcon: null as any,
        display_id: "1",
        id: "source1",
        name: "other win",
        thumbnail: null as any,
      },
      {
        appIcon: null as any,
        display_id: "2",
        id: "source2",
        name: "other win",
        thumbnail: null as any,
      },
      {
        appIcon: null as any,
        display_id: "3",
        id: "source1",
        name: validWindowName,
        thumbnail: null as any,
      },
      {
        appIcon: null as any,
        display_id: "4",
        id: "source1",
        name: validWindowName,
        thumbnail: null as any,
      },
    ];

    it("should select the first match", () => {
      const res = selectCaptureSource(validMockSources, validWindowName);
      expect(res).toEqual(validMockSources[2]);
    });

    it("should fallback to select the first element", () => {
      const res = selectCaptureSource(validMockSources, "invalidName");
      expect(res).toEqual(validMockSources[0]);
    });
  });

  describe("forceH264Sdp", () => {
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

    it("should reorder h264 to the front", () => {
      const expectedSerialization = "ser";
      parseSdp.mockImplementationOnce(() => {
        return validSdp;
      });
      writeSdp.mockImplementationOnce(() => {
        return expectedSerialization;
      });
      expect(forceH264Sdp(null)).toBe(expectedSerialization);
      expect(parseSdp).toHaveBeenCalledTimes(1);
      expect(parseSdp).toHaveBeenCalledWith(null);
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
      expect(() => forceH264Sdp(null)).toThrowError(/missing payloads/);
      expect(parseSdp).toHaveBeenCalledTimes(1);
      expect(parseSdp).toHaveBeenCalledWith(null);
      expect(writeSdp).toHaveBeenCalledTimes(0);
    });
  });

  describe("parsePeers", () => {
    it("should parse peers", () => {
      expect(parsePeers("name,1,1")).toEqual([{
        connected: true,
        id: "1",
        name: "name",
      }]);

      expect(parsePeers("name,1,1\nname2,2,1")).toEqual([
        {
          connected: true,
          id: "1",
          name: "name",
        },
        {
          connected: true,
          id: "2",
          name: "name2",
        },
      ]);
    });

    it("should fail on bad strings", () => {
      expect(parsePeers("")).toEqual([]);
      expect(() => parsePeers("one,1")).toThrow();
      expect(() => parsePeers("one,1,2,3,4")).toThrow();
    });
  });
});
