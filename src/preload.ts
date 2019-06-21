import { remote } from "electron";
import { default as pino, Logger } from "pino";
import { v4 as uuid } from "uuid";
import {
    createPeer,
    createStream,
    fireInputEvent,
    forceH264Sdp,
    getDesktopSources,
    ISharedObject,
    selectCaptureSource,
    sharedObjectKeyName } from ".";
import { Signal } from "./signal";

const preloadLogger = pino();

// when our browser window as officially loaded, we'll begin
process.once("loaded", () => {
    // we must get our shared state from the other process
    const sharedObject = (remote.getGlobal(sharedObjectKeyName) as ISharedObject);

    // we'll use the allowPreload flag to indicate to ourselves that we're on the first load of the page
    // and should therefore be setting up webrtc and whatnot - we need this as preload scripts load each
    // time the page inside the browser load changes (ie: a redirect, window reload, etc) and we want to persist
    const allowPreload = sharedObject.allowPreload;
    preloadLogger.info("loaded");
    preloadLogger.info(`${allowPreload}`);

    if (allowPreload) {
        sharedObject.allowPreload = false;
    }

    // finally, we'll get the contents of the browser view, and wait for it to be ready
    const webContents = remote.getCurrentWebContents();
    webContents.once("dom-ready", () => {
        // when it's ready, if it's our first load (see above) we setup webrtc
        if (allowPreload) {
            preloadLogger.info("allocating webrtc provider");
            startWebrtcProvider(sharedObject, preloadLogger);
        }
    });
});

/**
 * Configure and start a webrtc provider inside a page
 * @param so shared object
 */
export function startWebrtcProvider(so: ISharedObject, logger: Logger) {
    const {
        captureWindowTitle,
        iceServers,
        pollInterval,
        pollUrl } = so;
    const captureWindow = remote.BrowserWindow.getAllWindows().find((w) => w.getTitle() === captureWindowTitle);

    if (!captureWindow) {
        logger.error("no capture window found");
        return;
    }

    getDesktopSources()
        .then((sources) => selectCaptureSource(sources as any, captureWindowTitle))
        .then((source) => {
            if (!source) {
                throw new Error("No source found");
            }

            logger.info(`selected source ${source.name}`);

            return source;
        })
        .then((source) => createStream(source))
        .then((stream) => createPeer({
            config: {
                iceServers,
            },
            initiator: false,
            sdpTransform: forceH264Sdp,
            stream,
        }))
        .then(async (webrtc) => {
            let remoteId: string;
            const sig = new Signal({
                pollIntervalMs: pollInterval,
                url: pollUrl,
            });
            await sig.signIn(captureWindowTitle + uuid());
            sig.on("error", (err) => {
                logger.error(`sig fail: ${err}`);
            });
            sig.on("peer-message", (data, id) => {
                remoteId = id;
                const parsed = JSON.parse(data);
                // rewrap
                if (parsed.candidate) {
                    parsed.candidate = { candidate: parsed.candidate };
                }
                webrtc.signal(parsed);
            });
            webrtc.on("signal", async (data) => {
                // unwrap
                if (data.candidate) {
                    data = data.candidate;
                }
                await sig.send(JSON.stringify(data), remoteId);
            });
            webrtc.on("data", (data) => {
                data = data.toString();
                const imsg = JSON.parse(data) as {type: string, version: number, data: any};
                fireInputEvent(captureWindow.webContents, imsg);
            });
        })
        .then(() => {
            logger.info("peer created");
        }, (err) => {
            logger.error(`peer failed ${err.stack}`);
        });
}
