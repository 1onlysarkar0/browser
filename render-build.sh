#!/usr/bin/env bash
set -o errexit

echo "========================================="
echo "==> Render Build Script Starting..."
echo "========================================="

# Set Puppeteer cache to persistent project directory
export PUPPETEER_CACHE_DIR="/opt/render/project/.cache/puppeteer"
echo "==> PUPPETEER_CACHE_DIR: $PUPPETEER_CACHE_DIR"

# Create cache directory
mkdir -p "$PUPPETEER_CACHE_DIR"

# Install dependencies (this triggers postinstall which installs Chromium)
echo "==> Installing dependencies..."
npm install

# Build the application (both client and server)
echo "==> Building application..."
npm run build

# Verify dist/index.cjs was created
if [ -f "dist/index.cjs" ]; then
  echo "==> SUCCESS: Server bundle created at dist/index.cjs"
else
  echo "==> ERROR: dist/index.cjs not found!"
  exit 1
fi

# Verify Chromium installation
echo "==> Verifying Chromium installation..."
if [ -d "$PUPPETEER_CACHE_DIR/chrome" ]; then
  echo "==> SUCCESS: Chromium cache found!"
  CHROME_PATH=$(find "$PUPPETEER_CACHE_DIR" -name "chrome" -type f 2>/dev/null | head -1)
  if [ -n "$CHROME_PATH" ]; then
    echo "==> Chrome executable: $CHROME_PATH"
  fi
else
  echo "==> WARNING: Chromium cache not found in $PUPPETEER_CACHE_DIR"
  echo "==> Searching for Chromium in other locations..."
  find /opt/render -name "chrome" -type f 2>/dev/null | head -5 || true
fi

# Save Chromium path to config for runtime
CHROME_PATH=$(find "$PUPPETEER_CACHE_DIR" -name "chrome" -type f 2>/dev/null | head -1)
if [ -n "$CHROME_PATH" ]; then
  mkdir -p data
  echo "{\"path\": \"$CHROME_PATH\", \"installedAt\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"environment\": \"render\"}" > data/chromium-path.json
  echo "==> Chromium path saved to data/chromium-path.json"
fi

echo "========================================="
echo "==> Build completed successfully!"
echo "========================================="
