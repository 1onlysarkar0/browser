# Dockerfile (for Render / any Docker host)
FROM node:18-slim

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Install Chromium dependencies + chromium (lightweight)
RUN apt-get update && apt-get install -y --no-install-recommends \
  chromium \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcairo2 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnss3 \
  libnspr4 \
  libx11-6 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  libxshmfence1 \
  libxrender1 \
  libxcb1 \
  libasound2 \
  ca-certificates \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Set Puppeteer environment variables (if using puppeteer)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_CACHE_DIR=/tmp/puppeteer-cache
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files first to leverage docker cache
COPY package*.json ./
# If you use package-lock.json / pnpm-lock, copy that too

RUN npm ci --unsafe-perm

# Copy rest of project
COPY . .

# If you need to run build step
RUN npm run build || true

# Expose port (if your app uses 3000, change accordingly)
EXPOSE 3000

# Start command
CMD ["npm", "run", "start"]
