# browserd

Headless electron app platform for the cloud 🤕☁✨

[![Build Status](https://b3ngr33ni3r.visualstudio.com/browserd/_apis/build/status/bengreenier.browserd?branchName=master)](https://b3ngr33ni3r.visualstudio.com/browserd/_build/latest?definitionId=9&branchName=master)

We needed a way to run chrome-based browser experiences inside a container, and to stream that container to [remote clients](https://github.com/bengreenier/browserd/issues/2) using webrtc.
Browserd (named to indicate it's a browser [daemon](https://en.wikipedia.org/wiki/Daemon_(computing))) uses electron to do so.

## Signaling server

Our service is compatible with any standard WebRTC signaling implementation. If you need a simple one that communicates over HTTP/1.1, [webrtc-signal-http](https://github.com/bengreenier/webrtc-signal-http) is a good option.

## Configuration

Our service can be configured using a [dotenv](https://www.npmjs.com/package/dotenv) file - `.env` containing one environment variable
key and value per line. For example `KEY=value`. Below are the possible options:

+ `SERVICE_URL` (string) - the web service address (to render)
+ `TURN_URL` (string) - a turn address
+ `TURN_USERNAME` (string) - a turn username
+ `TURN_PASSWORD` (string) - a turn password credential
+ `POLL_URL` (string) - a signaling server base address
+ `POLL_INTERVAL` (number) - a signaling poll interval in ms
+ `HEIGHT` (number) - the window height
+ `WIDTH` (number) - the window width
+ `EXP_HIDE_STREAMER` (boolean) - experiment flag for hiding the streamer window

## Running

How to get browserd up and running. ⚙

### Docker
> Note: Your `.env` file should be in the project directory (next to `package.json`) - for more details see the
[Configuration](#configuration) section above.

You'll need [docker](https://docs.docker.com/install/) to build and run. Once you have it, you can build and run:

```
# build the container (and source)
docker build . -t browserd:local

# run
docker run -it --env-file .env browserd:local
```

### Locally

> Note: Your `.env` file should be in the project directory (next to `package.json`) - for more details see the
[Configuration](#configuration) section above.

You'll need [`Node LTS (v10.x.x)`](https://nodejs.org/en/) and `npm` (bundled with the node installer`) to build and run. Once you have
those, you can install dependencies and run:

```
# install deps
npm install

# build and run
npm start
```

## Contributing

Coming soon. ✨

## License

MIT
