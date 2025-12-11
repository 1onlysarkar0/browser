# Dockerfile for Node 18 + system Chromium (Render-ready)
FROM node:18-slim

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Install minimal chromium and libs required by Puppeteer/Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    curl \
    libatk1.0-0 libatk-bridge2.0-0 libcairo2 libdrm2 libgbm1 libgtk-3-0 \
    libnss3 libnspr4 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxkbcommon0 libxrandr2 libxshmfence1 libxrender1 libxcb1 libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer not to download its own chromium during npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install dependencies (copy package manifests first to leverage docker layer cache)
COPY package*.json ./

# Use npm ci for reproducible installs (works with package-lock.json)
RUN npm ci --unsafe-perm

# Copy app source
COPY . .

# Build the app (if your project has a build step)
RUN npm run build || true

# Expose port your app listens on (change if not 3000)
EXPOSE 3000

# Start command (adjust if your package.json uses a different start script)
CMD ["npm", "run", "start"]
