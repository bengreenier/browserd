# build, lint, and test
FROM node:12.4 as builder
WORKDIR /usr/app/builder
COPY ./components/shared ./components/shared/
COPY ./package*.json ./
COPY ./lerna.json ./
RUN npm install lerna -g
RUN echo y | lerna clean
RUN lerna bootstrap
WORKDIR components/shared
RUN npm run lint
RUN npm run build
RUN npm run test



