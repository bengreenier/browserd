import { config } from "dotenv";
import { app as electronApp } from "electron";
import pino from "pino";
import url from "url";
import { Application } from "./application";
import { requestTwilioTurnServer } from "./turn";
import { Win } from "./win";

// we'll export this and use it for testing
// it won't impact the runtime as the runtime ignores it
let runtimeIgnoredExportSuccess: () => void;
let runtimeIgnoredExportFailure: (err: Error) => void;
const runtimeIgnoredExportValue: Promise<void> = new Promise((resolve, reject) => {
  runtimeIgnoredExportSuccess = resolve;
  runtimeIgnoredExportFailure = reject;
});

const logger = pino();

/**
 * Configure dotenv - Supported values:
 * + SERVICE_URL (string) - the web service address (to render)
 * + TURN_URL (string) - a turn address
 * + TURN_USERNAME (string) - a turn username
 * + TURN_PASSWORD (string) - a turn password credential
 * + POLL_URL (string) - a signaling server base address
 * + POLL_INTERVAL (number) - a signaling poll interval in ms
 * + HEIGHT (number) - the window height
 * + WIDTH (number) - the window width
 * + EXP_HIDE_STREAMER (boolean) - experiment flag for hiding the streamer window
 * + TWILIO_ACCOUNT_SID (string) - a Twilio AccountSid required to get a Network Traversal Service Token
 * + TWILIO_AUTH_TOKEN (string) - a Twilio AuthToken required to get a Network Traversal Service Token
 */
const dotenv = config();
let mutableEnv: {[key: string]: string | undefined} = {};
if (dotenv.error) {
  logger.warn(`dotenv failed: ${dotenv.error}`);
} else {
  mutableEnv = {...process.env, ...dotenv.parsed};
}
const env: {[key: string]: string} = mutableEnv as {[key: string]: string};

// early exit if missing critical environment variables
[
  "SERVICE_URL",
  "POLL_URL",
  "POLL_INTERVAL",
  "WIDTH",
  "HEIGHT",
  "EXP_HIDE_STREAMER",
].filter((expectedEnvKey) => {
  return env[expectedEnvKey] === undefined;
}).forEach((key) => {
  logger.error(`missing env: ${key}`);
  process.exit(-1);
});

// keep the app in global memory, to prevent gc
let app: Application;

electronApp.on("ready", async () => {
  let iceServers: RTCIceServer[] = [
    {
      credential: env.TURN_PASSWORD,
      credentialType: "password",
      urls: [env.TURN_URL],
      username: env.TURN_USERNAME,
    },
  ];

  // if we have twilio info, we'll use that (overriding raw TURN credentials)
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    iceServers = await requestTwilioTurnServer(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN).catch((err: any) => {
      logger.error(`Node: Twilio failed: ${err}`);
      process.exit(-2);
    }).then(() => []);
    logger.info("Node: using Twilio");
  }

  app = new Application({
    captureWindowTitle: url.parse(env.SERVICE_URL).hostname as string,
    expHideStreamer: env.EXP_HIDE_STREAMER === "true",
    height: Number.parseInt(env.HEIGHT, 10).valueOf(),
    logger,
    signalConfig: {
      pollIntervalMs: Number.parseInt(env.POLL_INTERVAL, 10).valueOf(),
      url: env.POLL_URL,
    },
    streamerConfig: {
      iceServers,
    },
    url: env.SERVICE_URL,
    width: Number.parseInt(env.WIDTH, 10).valueOf(),
    winProvider: new Win(),
  });

  app.boot().then(() => {
    logger.info("Node: booted");
  }, (err) => {
    logger.error(`Node: boot failed: ${err}`);
  });
});

module.exports = runtimeIgnoredExportValue;
