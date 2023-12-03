FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY server/ ./server
COPY public/ ./public

EXPOSE 3000

CMD [ "node", "./server/server.js" ]

