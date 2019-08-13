import $ from "jquery";
import pino from "pino";
import SimplePeer from "simple-peer";
import { v4 as uuid } from "uuid";
import { Signal } from "../../shared/src/signal";
import { BaseSignalProvider, ISignalPeer } from "../../shared/src/signal-provider";
import { HtmlInputEvents, InputMonitor } from "./input";

const logger = pino();

/**
 * Connect to signaling server and get stream provider id
 */
export const signIn = async (signalProvider: BaseSignalProvider) => {
  // Generate a random uuid for peer name
  const peerName = uuid();

  // Get stream provider id
  let streamProviderId;
  const peers = await signalProvider.signIn(peerName);
  const streamConsumerId = signalProvider.id;
  peers.forEach((peer: ISignalPeer) => {
    if (peer.id !== streamConsumerId) {
      streamProviderId = peer.id;
    }
  });

  if (!streamProviderId) {
    throw new Error("Couldn't find any stream provider");
  }

  return streamProviderId;
};

/**
 * Connect to stream provider and render video
 */
export const connect = async () => {
  // Init signal provider
  const signalProvider = new Signal({
    pollIntervalMs: $("#poll-interval").val() as number,
    url: $("#signaling-server").val() as string,
  });

  signalProvider.on("error", (err) => {
    logger.error(`Signal error: ${err}`);
  });

  signalProvider.on("peer-message", (data) => {
    logger.info(data);
    const parsed = JSON.parse(data);

    // rewrap
    if (parsed.candidate) {
      parsed.candidate = {
        candidate: parsed.candidate,
        sdpMLineIndex: parsed.sdpMLineIndex,
        sdpMid: parsed.sdpMid,
      };
    }

    peer.signal(parsed);
  });

  // Get stream provider Id
  const providerId = await signIn(signalProvider);

  // Init simple peer
  const iceServers: RTCIceServer[] = [
    {
      credential: $("#turn-password").val() as string,
      credentialType: "password",
      urls: [$("#turn-server").val() as string],
      username: $("#turn-username").val() as string,
    },
  ];

  const peer = new SimplePeer({
    config: {
      iceServers,
    },
    initiator: true,
    trickle: false,
  });

  peer.on("error", (err) => logger.error(err));
  peer.on("connect", () => logger.info("connect"));
  peer.on("close", () => logger.info("disconnect"));
  peer.on("signal", async (data) => {
    // unwrap
    if (data.candidate) {
      data = data.candidate;
    }

    await signalProvider.send(JSON.stringify(data), providerId);
  });

  peer.on("stream", (rstream: MediaStream) => {
    // Play video
    const videoElement = $("#remote-video") as any as HTMLVideoElement[];
    videoElement[0].srcObject = rstream;
    videoElement[0].play();

    // Input handling
    const inputMonitor = new InputMonitor(videoElement[0]);
    const sendInputToPeer = (data: any) => {
      peer.send(JSON.stringify(data));
    };

    inputMonitor.on(HtmlInputEvents.Mouseup, sendInputToPeer);
    inputMonitor.on(HtmlInputEvents.Mousedown, sendInputToPeer);
  });
};

$(document).ready(() => {
  $("#connect").click(() => connect());
});
