import { config as configEnv } from "dotenv";
import { app, BrowserWindow } from "electron";
import { default as pino } from "pino";
import { createWindow, ISharedObject, sharedObjectKeyName } from ".";
import { requestTwilioTurnServer } from "./turn";

const logger = pino();
logger.info(`working directory: ${process.cwd()}`);

/**
 * Configure our environment variables from dotenv
 * Supported:
 *  + SERVICE_URL (string) - the web service address (to render)
 *  + TURN_URL (string) - a turn address
 *  + TURN_USERNAME (string) - a turn username
 *  + TURN_PASSWORD (string) - a turn password credential
 *  + POLL_URL (string) - a signaling server base address
 *  + POLL_INTERVAL (number) - a signaling poll interval in ms
 *  + HEIGHT (number) - the window height
 *  + WIDTH (number) - the window width
 *  + EXP_HIDE_STREAMER (boolean) - experiment flag for hiding the streamer window
 *  + TWILIO_ACCOUNT_SID (string) - a Twilio AccountSid required to get a Network Traversal Service Token
 *  + TWILIO_AUTH_TOKEN (string) - a Twilio AuthToken required to get a Network Traversal Service Token
 */
const envParserStatus = configEnv();
if (envParserStatus.error) {
    logger.error(`Failed to parse dotenv: ${envParserStatus.error}`);
} else if (envParserStatus.parsed) {
    logger.info(envParserStatus.parsed);
}
[
    "SERVICE_URL",
    "TURN_URL",
    "TURN_USERNAME",
    "TURN_PASSWORD",
    "POLL_URL",
    "POLL_INTERVAL",
    "WIDTH",
    "HEIGHT",
    "EXP_HIDE_STREAMER",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
].filter((expectedEnvKey) => {
    return process.env[expectedEnvKey] === undefined;
}).forEach((key) => {
    logger.error(`missing env: ${key}`);
    process.exit(-1);
});

let contentWindow: BrowserWindow;
let streamerWindow: BrowserWindow;

// when eletron is ready to go, we begin
app.on("ready", async () => {
    // TURN servers array
    let iceServers: RTCIceServer[] = [];

    try {
        // We prioritize Twilio over coturn for turn servers
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            iceServers = await requestTwilioTurnServer(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        } else {
            iceServers = [
                {
                    credential: process.env.TURN_PASSWORD,
                    credentialType: "password",
                    urls: [process.env.TURN_URL as string],
                    username: process.env.TURN_USERNAME,
                },
            ];
        }
    } catch (err) {
        logger.error(err);
        process.exit(-1);
    }

    // we'll name our window after the service url (this is critical, as it's how we'll get the video stream)
    const captureWindowTitle = process.env.SERVICE_URL as string;

    // we need to share some state with the capturer (in a different process) - so we set that up here
    (global as NodeJS.Global & { sharedObject: ISharedObject })[sharedObjectKeyName] = {
        allowPreload: true,
        captureWindowTitle,
        iceServers,
        pollInterval: Number.parseInt(process.env.POLL_INTERVAL as string, 10).valueOf(),
        pollUrl: process.env.POLL_URL as string,
    };

    // finally, we create the window that will host our stream content - it's just a regular window
    contentWindow = await createWindow(process.env.SERVICE_URL as string, {
        alwaysOnTop: true,
        backgroundColor: "#000",
        height: Number.parseInt(process.env.HEIGHT as string, 10).valueOf(),
        title: captureWindowTitle,
        width: Number.parseInt(process.env.WIDTH as string, 10).valueOf(),
    });
    logger.info("main window created");

    // we also want to ensure that the window menu isn't there (so we don't stream it)
    contentWindow.setMenu(null);
    contentWindow.setMenuBarVisibility(false);

    // give our content window another second - to be sure x is happy
    await new Promise((resolve) => setTimeout(() => resolve(), 1000));

    // then we can create our stream provider - note we'll use the webrtc-internals endpoint
    // as the url (since a window should have a url)...this is also a nice debugging feature
    streamerWindow = await createWindow("chrome://webrtc-internals", {
        height: 10,
        webPreferences: {
            // this is what triggers our actual streamer logic (webrtc init and whatnot)
            preload: `${__dirname}/preload.js`,
        },
        width: 10,
        x: 100,
        y: 100,
    });

    logger.info("stream provider window created");

    // if we're running the hide_streamer flight, hide it
    if (process.env.EXP_HIDE_STREAMER === "true") {
        streamerWindow.hide();
        logger.info("experiment: hiding streamer window");
    }
});
