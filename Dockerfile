FROM node:17

WORKDIR /app
COPY . /app
RUN npm install --production
