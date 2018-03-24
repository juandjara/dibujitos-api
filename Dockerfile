FROM node:9-alpine

WORKDIR /usr/app

COPY package.json .
RUN npm install --production

COPY . .