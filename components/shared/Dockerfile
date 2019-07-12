# build, lint, and test
FROM node:12.4 as builder
WORKDIR /usr/app/builder
COPY ./components/shared ./components/shared
COPY ./*.json ./
RUN npm install
RUN npm run clean && npm run bootstrap && npm run build
RUN npm run lint && npm run test



