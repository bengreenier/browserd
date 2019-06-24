import { IDeviceInfo } from "../../base/stream-provider";
import { UserMedia } from "../../browser/usermedia";

describe("UserMedia", () => {
  it("should query for sources", async () => {
    const getSources = jest.fn();
    const instance = new UserMedia({
      getSources,
      getUserMedia: jest.fn(),
    });

    const expectedDevices: IDeviceInfo[] = [
      {
        id: "test",
        name: "test",
      },
      {
        id: "other",
        name: "other",
      },
    ];

    getSources.mockImplementationOnce((opts, cb) => {
      return cb(null, expectedDevices);
    });

    const devices = await instance.enumerateDevices();
    expect(devices).toEqual(expectedDevices);
    expect(getSources).toHaveBeenCalledTimes(1);
    expect(getSources.mock.calls[0][0]).toEqual({
      types: [
        "screen",
        "window",
      ],
    });
  });

  it("should attempt to getUserMedia", async () => {
    const getUserMedia = jest.fn();
    const instance = new UserMedia({
      getSources: jest.fn(),
      getUserMedia,
    });

    const expectedDevice: IDeviceInfo = {
      id: "test",
      name: "test",
    };

    const stream = await instance.createStream(expectedDevice);

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        mandatory: {
          chromeMediaSource: "system",
          chromeMediaSourceId: "test",
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: "test",
        },
      },
    });
  });
});
