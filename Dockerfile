# lint, test, transpile and buid binary
FROM node:12.4 as builder
WORKDIR /usr/app/builder
COPY package*.json ts*.json ./
COPY ./src ./src
RUN npm install
RUN npm run lint
RUN npm run test
RUN npm run dist

FROM bengreenier/docker-xvfb:buster-slim as runner
# Create a lower-priv user (electron) to run as
RUN groupadd -r electron \
  && useradd -r -g electron -G audio,video,tty,dialout electron \
  && mkdir -p /home/electron/Downloads \
  && chown -R electron:electron /home/electron \
  && mkdir /home/electron/.config
WORKDIR /home/electron/browserd
COPY --from=builder /usr/app/builder/bin/*.deb ./
RUN apt-get update && apt-get install -y ./*.deb

FROM runner as release
# move in resources
COPY .docker-display.conf .
COPY .docker-x-boot.sh .
RUN apt-get update && apt-get install -y dos2unix
RUN dos2unix .docker-display.conf .docker-x-boot.sh
RUN chmod +x .docker-x-boot.sh
CMD browserd --no-sandbox --disable-gpu 
