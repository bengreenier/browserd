import { signIn } from "../main";
import { BaseSignalProvider, ISignalPeer } from "../../../shared/src/signal-provider";

const Signal: jest.Mocked<BaseSignalProvider> = {
  signIn: jest.fn(),
} as Partial<BaseSignalProvider> as any;

describe("signIn", () => {
  it("fail to find stream provider", async () => {
    const peers: ISignalPeer[] = [
      { connected: false, id: "1", name: "peer1" },
    ];

    Signal.signIn.mockImplementation(_ => {
      return Promise.resolve(peers);
    });

    await expect(signIn(Signal)).rejects.toThrowError();
  });
});
