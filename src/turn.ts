import { default as twilio } from "twilio";

/**
 * Twilio ice server
 */
export interface ITwilioIceServer {
    /**
     * The STUN/TURN endpoint url
     */
    url: string;

    /**
     * The username required for authentication (TURN endpoint only)
     */
    username?: string;

    /**
     * The credential required for authentication (TURN endpoint only)
     */
    credential?: string;
}

/**
 * Request TURN servers from Twilio
 * @param accountSid Twilio AccountSid required for Traversal Service Token retrieval
 * @param authToken Twilio AuthToken required for Traversal Service Token retrieval
 * @returns {RTCIceServer[]} the array of TURN servers
 */
export const requestTwilioTurnServer = async (accountSid: string, authToken: string) => {
    const client = twilio(accountSid, authToken);
    const token = await client.tokens.create();
    const twilioIceServers = JSON.parse(JSON.stringify(token.iceServers));
    const iceServers: RTCIceServer[] = [];
    twilioIceServers.forEach((twilioIceServer: ITwilioIceServer) => {
        // Filter out turn servers
        if (twilioIceServer.url.startsWith("turn:")) {
            iceServers.push({
                credential: twilioIceServer.credential,
                credentialType: "password",
                urls: twilioIceServer.url,
                username: twilioIceServer.username,
            });
        }
    });

    return iceServers;
};
