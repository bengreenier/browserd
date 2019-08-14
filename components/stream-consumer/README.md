# browserd/stream-consumer

The component that consumes and interacts with content from the cloud 🤕☁✨

![Project status](https://img.shields.io/badge/Project%20Status-Beta-green.svg)
[![Build Status](https://dev.azure.com/bengreenier/browserd/_apis/build/status/stream-consumer?branchName=master)](https://dev.azure.com/bengreenier/browserd/_build/latest?definitionId=14&branchName=master)

This component is a simple static webpage that can connect to a [stream-provider](../stream-provider) and is able to send input and receive content from an electron based app running in a container on the cloud.

## Signaling server

This component is compatible with any standard WebRTC signaling implementation. If you need a simple one that communicates over HTTP/1.1, [webrtc-signal-http](https://github.com/bengreenier/webrtc-signal-http) is a good option.

## Running

You'll need [`Node LTS (v10.x.x)`](https://nodejs.org/en/) and `npm` (bundled with the node installer) to build and run. Once you have those, you can install dependencies and run:

```
# use lerna to hoist dependencies and link local dependencies
npx lerna bootstrap --hoist

# build
npx lerna run build
```
To run, open `index.html` in any browser that supports WebRTC.

## Input

Mouse events are supported. Make sure that the dimension of the video element in the html page matches with the stream provider window dimension.
