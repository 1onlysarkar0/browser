FROM node:18-slim
ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates curl \
    libatk1.0-0 libatk-bridge2.0-0 libcairo2 libdrm2 libgbm1 libgtk-3-0 \
    libnss3 libnspr4 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxkbcommon0 libxrandr2 libxshmfence1 libxrender1 libxcb1 libasound2 \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --unsafe-perm

COPY . .
RUN npm run build || true

EXPOSE 3000
CMD ["npm", "run", "start"]
