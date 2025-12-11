#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

async function installChromium() {
  console.log("📦 Installing Chromium for Puppeteer...");
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const version = await browser.version();
    const executablePath = browser.process()?.spawnfile;
    
    await browser.close();
    
    console.log("✅ Chromium installed successfully!");
    console.log(`📍 Chromium Path: ${executablePath}`);
    console.log(`🔢 Version: ${version}`);
    
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const configPath = path.join(dataDir, "chromium-path.json");
    fs.writeFileSync(configPath, JSON.stringify({ 
      path: executablePath, 
      version,
      installedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`💾 Path saved to: ${configPath}`);
    
  } catch (error) {
    console.error("❌ Failed to install/verify Chromium:", error.message);
    console.log("\n📋 Required system libraries for Chromium:");
    console.log("   - glib, nss, nspr, atk, at-spi2-atk");
    console.log("   - cups, dbus, expat, libdrm");
    console.log("   - xorg.libX11, xorg.libXcomposite, xorg.libXdamage");
    console.log("   - xorg.libXext, xorg.libXfixes, xorg.libXrandr");
    console.log("   - xorg.libxcb, mesa, pango, cairo");
    console.log("   - alsa-lib, gtk3, libxkbcommon");
    console.log("\n🔧 On Replit, these are installed via the packager.");
    process.exit(1);
  }
}

installChromium();
