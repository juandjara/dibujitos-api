FROM node:9-alpine

WORKDIR /usr/app

COPY package.json .
RUN apt-get install git && npm install --production

COPY . .