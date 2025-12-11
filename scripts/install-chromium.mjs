#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// Determine cache directory based on environment
// On Render: Use /opt/render/project/.cache/puppeteer (persisted between build and runtime)
// On Replit/local: Use project-local .cache/puppeteer
function getCacheDir() {
  if (process.env.PUPPETEER_CACHE_DIR) {
    return process.env.PUPPETEER_CACHE_DIR;
  }
  if (process.env.RENDER) {
    return "/opt/render/project/.cache/puppeteer";
  }
  return path.join(process.cwd(), ".cache", "puppeteer");
}

const PUPPETEER_CACHE_DIR = getCacheDir();

async function installChromium() {
  console.log("📦 Installing Chromium for Puppeteer...");
  console.log(`📂 Cache directory: ${PUPPETEER_CACHE_DIR}`);
  console.log(`📂 Environment: ${process.env.RENDER ? 'Render' : 'Local/Replit'}`);
  
  // Ensure cache directory exists
  if (!fs.existsSync(PUPPETEER_CACHE_DIR)) {
    fs.mkdirSync(PUPPETEER_CACHE_DIR, { recursive: true });
    console.log(`📁 Created cache directory: ${PUPPETEER_CACHE_DIR}`);
  }
  
  // Set the cache path for Puppeteer
  process.env.PUPPETEER_CACHE_DIR = PUPPETEER_CACHE_DIR;
  
  try {
    // First, try to get the executable path from Puppeteer
    let executablePath;
    try {
      executablePath = puppeteer.executablePath();
      console.log(`📍 Puppeteer default path: ${executablePath}`);
      
      if (executablePath && fs.existsSync(executablePath)) {
        console.log("✅ Chromium already available!");
        saveConfig(executablePath, "pre-installed");
        return;
      }
    } catch (e) {
      console.log("⚠️ No default Chromium found, will attempt download...");
    }
    
    // Try to launch the browser to verify/download Chromium
    console.log("🚀 Launching Puppeteer to trigger Chromium download...");
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
        "--no-zygote",
        "--disable-gpu",
      ],
    });
    
    const version = await browser.version();
    executablePath = browser.process()?.spawnfile;
    
    await browser.close();
    
    console.log("✅ Chromium installed successfully!");
    console.log(`📍 Chromium Path: ${executablePath}`);
    console.log(`🔢 Version: ${version}`);
    
    saveConfig(executablePath, version);
    
  } catch (error) {
    console.error("❌ Failed to install/verify Chromium:", error.message);
    console.log("\n📋 Troubleshooting tips:");
    console.log("   1. On Render: Set PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer");
    console.log("   2. Use render-build.sh as your build command");
    console.log("   3. Required system libraries may be missing");
    console.log("\n📋 Required system libraries for Chromium:");
    console.log("   - glib, nss, nspr, atk, at-spi2-atk");
    console.log("   - cups, dbus, expat, libdrm");
    console.log("   - xorg.libX11, xorg.libXcomposite, xorg.libXdamage");
    console.log("   - xorg.libXext, xorg.libXfixes, xorg.libXrandr");
    console.log("   - xorg.libxcb, mesa, pango, cairo");
    console.log("   - alsa-lib, gtk3, libxkbcommon");
    // Don't exit with error - allow the app to start and handle missing Chromium gracefully
    process.exit(0);
  }
}

function saveConfig(executablePath, version) {
  try {
    // Save the path to a config file in the data directory
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const configPath = path.join(dataDir, "chromium-path.json");
    fs.writeFileSync(configPath, JSON.stringify({ 
      path: executablePath, 
      version,
      cacheDir: PUPPETEER_CACHE_DIR,
      installedAt: new Date().toISOString(),
      environment: process.env.RENDER ? 'render' : 'local'
    }, null, 2));
    
    console.log(`💾 Path saved to: ${configPath}`);
  } catch (e) {
    console.error("⚠️ Failed to save config:", e.message);
  }
}

installChromium();
