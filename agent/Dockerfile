FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# IMPORTANT: Puppeteer vars, not Playwright vars
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package.json ./

RUN npm install --omit=dev

COPY . .

ENV PORT=8788
ENV DATA_DIR=/data

VOLUME ["/data"]

EXPOSE 8788

CMD ["node", "server.js"]