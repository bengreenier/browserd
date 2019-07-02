# lint, test, transpile and buid binary (as deb)
FROM node:12.4 as builder
WORKDIR /usr/app/builder
COPY package*.json ts*.json ./
COPY ./src ./src
# use npm to complete lifecycle operations
RUN npm install
RUN npm run lint
RUN npm run test
RUN npm run dist

# setup runtime
FROM debian:stretch-slim as runner
# Create a lower-priv user (electron) to run as
RUN groupadd -r electron \
  && useradd -r -g electron -G audio,video,tty,dialout electron \
  && mkdir -p /home/electron/Downloads \
  && chown -R electron:electron /home/electron \
  && mkdir /home/electron/.config \
  && chown -R electron:electron /home/electron/.config
WORKDIR /home/electron/browserd
COPY --from=builder /usr/app/builder/bin/*.deb ./
# install the deb
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y \
  && apt-get install -y xvfb xauth libgl1-mesa-dri \
  && apt-get install -y ./*.deb \
  && rm -rf /var/lib/apt/lists/*

# build release image
FROM runner as release
# we start as root, but quickly drop to "electron"
USER root
# as root:
# start dbus system
# as electron:
# start dbus session
# start x11 session (xvfb)
# start browserd
CMD service dbus start \
  && su electron -c 'dbus-run-session -- xvfb-run -s "-ac -br -nocursor -screen 0 1920x1080x24 -nolisten tcp" browserd --no-sandbox --disable-gpu'
