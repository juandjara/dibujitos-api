FROM node:9-alpine

WORKDIR /usr/app

COPY package.json .
RUN apk add --no-cache git && npm install --production

COPY . .