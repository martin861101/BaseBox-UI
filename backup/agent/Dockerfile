FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install --omit=dev
COPY . .
ENV PORT=8788
ENV DATA_DIR=/data
VOLUME ["/data"]
EXPOSE 8788
CMD ["node", "server.js"]
