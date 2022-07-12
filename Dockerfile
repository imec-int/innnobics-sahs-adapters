FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY ./src .

RUN npm install pm2 -g

EXPOSE 8080
CMD ["pm2-runtime", "index.js"]
