#!/usr/bin/env node

import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const SYSTEM_CHROME_PATHS = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  process.env.PUPPETEER_EXECUTABLE_PATH,
].filter(Boolean);

function findSystemChrome() {
  for (const chromePath of SYSTEM_CHROME_PATHS) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  return null;
}

function getCacheDir() {
  if (process.env.PUPPETEER_CACHE_DIR) {
    return process.env.PUPPETEER_CACHE_DIR;
  }
  if (process.env.RENDER) {
    return "/opt/render/project/.cache/puppeteer";
  }
  return path.join(process.cwd(), ".cache", "puppeteer");
}

function saveConfig(executablePath, version) {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const configPath = path.join(dataDir, "chromium-path.json");
    fs.writeFileSync(configPath, JSON.stringify({ 
      path: executablePath, 
      version,
      cacheDir: getCacheDir(),
      installedAt: new Date().toISOString(),
      environment: process.env.RENDER ? 'render' : (process.env.REPL_ID ? 'replit' : 'local')
    }, null, 2));
    
    console.log(`Chromium path saved to: ${configPath}`);
  } catch (e) {
    console.error("Failed to save config:", e.message);
  }
}

async function installChromium() {
  console.log("Checking for Chromium...");
  console.log(`Environment: ${process.env.RENDER ? 'Render' : (process.env.REPL_ID ? 'Replit' : 'Local')}`);
  
  const systemChrome = findSystemChrome();
  if (systemChrome) {
    console.log(`Found system Chrome at: ${systemChrome}`);
    console.log("Skipping Puppeteer Chromium download (using system Chrome)");
    saveConfig(systemChrome, "system");
    return;
  }

  if (process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD === "true") {
    console.log("PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is set, skipping download");
    console.log("Warning: No system Chrome found. Browser automation may not work.");
    process.exit(0);
  }

  const PUPPETEER_CACHE_DIR = getCacheDir();
  console.log(`Cache directory: ${PUPPETEER_CACHE_DIR}`);
  
  if (!fs.existsSync(PUPPETEER_CACHE_DIR)) {
    fs.mkdirSync(PUPPETEER_CACHE_DIR, { recursive: true });
    console.log(`Created cache directory: ${PUPPETEER_CACHE_DIR}`);
  }
  
  process.env.PUPPETEER_CACHE_DIR = PUPPETEER_CACHE_DIR;
  
  try {
    let executablePath;
    try {
      executablePath = puppeteer.executablePath();
      console.log(`Puppeteer default path: ${executablePath}`);
      
      if (executablePath && fs.existsSync(executablePath)) {
        console.log("Chromium already available!");
        saveConfig(executablePath, "pre-installed");
        return;
      }
    } catch (e) {
      console.log("No default Chromium found, will attempt download...");
    }
    
    console.log("Launching Puppeteer to trigger Chromium download...");
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
    
    console.log("Chromium installed successfully!");
    console.log(`Chromium Path: ${executablePath}`);
    console.log(`Version: ${version}`);
    
    saveConfig(executablePath, version);
    
  } catch (error) {
    console.error("Failed to install/verify Chromium:", error.message);
    console.log("\nTroubleshooting tips:");
    console.log("  1. Set PUPPETEER_EXECUTABLE_PATH to system Chrome path");
    console.log("  2. Install Chrome/Chromium system-wide");
    console.log("  3. Use Docker with pre-installed Chrome");
    process.exit(0);
  }
}

installChromium();
