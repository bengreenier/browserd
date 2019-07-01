import { ITwilioIceServer, requestTwilioTurnServer } from "../../node/turn";

const mockTwilioClient = {
  tokens: {
    create: jest.fn(),
  },
};

jest.mock("twilio", () => jest.fn(() => {
  return mockTwilioClient;
}));

describe("Turn", () => {
  describe("requestTwilioTurnServer", () => {
    const validAccountSid = "fakeAccountSid";
    const validAuthToken = "fakeAuthToken";
    const username = "fakeUsername";
    const credential = "fakeCredential";
    const twilioIceServers = [
      { url: "stun:fakeStun" },
      { url: "turn:fakeTurn1", username, credential },
      { url: "turn:fakeTurn2", username, credential },
    ] as ITwilioIceServer[];

    const generateFakeIceServers = (accountSid: string, authToken: string) => {
      if (accountSid !== validAccountSid || authToken !== validAuthToken) {
        throw new Error("Invalid accountSid or authToken");
      }

      return { iceServers: twilioIceServers };
    }

    it("fail to authenticate", async () => {
      const accountSid = "invalidAccountSid";
      const authToken = "invalidAuthToken";
      mockTwilioClient.tokens.create.mockImplementation(() => {
        generateFakeIceServers(accountSid, authToken);
      });

      await expect(requestTwilioTurnServer(accountSid, authToken)).rejects.toThrowError();
    });

    it("should return valid turn servers", async () => {
      const accountSid = "fakeAccountSid";
      const authToken = "fakeAuthToken";
      mockTwilioClient.tokens.create.mockImplementation(() => {
        return generateFakeIceServers(accountSid, authToken);
      });

      const iceServers = await requestTwilioTurnServer(accountSid, authToken);

      expect(iceServers.length).toEqual(3);
      iceServers.forEach((iceServer: RTCIceServer) => {
        const isTurn = (iceServer.urls as string).startsWith("turn:");
        if (isTurn) {
          expect(iceServer.username).toEqual(username);
          expect(iceServer.credential).toEqual(credential);
          expect(iceServer.credentialType).toEqual("password");
        } else {
          expect(iceServer.username).toBeFalsy();
          expect(iceServer.credential).toBeFalsy();
          expect(iceServer.credentialType).toBeFalsy();
        }
      });
    });
  });
});
