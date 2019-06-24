/**
 * Represents a stream device
 */
export interface IDeviceInfo {
  /**
   * The device name
   * Note: if the device represents a window, this will be the window name
   */
  name: string;

  /**
   * The device id
   * Note: this is usually some not human-readable identifier
   */
  id: string;
}

/**
 * Represents a stream
 */
export interface IStream {
  /**
   * Converts a stream to it's native type
   */
  toMediaStream(): MediaStream;
}

/**
 * Base stream provider
 */
export interface IStreamProvider {
  /**
   * Enumerate devices that can be used for streaming, optionally filtering
   * @param filter a device filter function
   * @returns a list of valid devices
   */
  enumerateDevices(filter?: (device: IDeviceInfo) => boolean): Promise<IDeviceInfo[]>;

  /**
   * Creates a stream from some device
   * @param device the device to open
   */
  createStream(device: IDeviceInfo): Promise<IStream>;
}
