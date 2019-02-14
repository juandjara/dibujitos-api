FROM node:10-alpine

WORKDIR /usr/app

COPY package.json .
COPY package-lock.json .
RUN apk add --no-cache git && npm ci

COPY . .