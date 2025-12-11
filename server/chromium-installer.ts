import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || "./data";
const CHROMIUM_CONFIG_PATH = path.join(DATA_DIR, "chromium-path.json");

// Cache the result so we don't keep checking on every request
let chromiumCheckDone = false;
let cachedChromiumPath: string | null = null;

function getPuppeteerCacheDir(): string {
  if (process.env.PUPPETEER_CACHE_DIR) {
    return process.env.PUPPETEER_CACHE_DIR;
  }
  if (process.env.RENDER) {
    return "/opt/render/project/.cache/puppeteer";
  }
  return path.join(process.cwd(), ".cache", "puppeteer");
}

interface ChromiumConfig {
  path: string;
  version?: string;
  cacheDir?: string;
  installedAt: string;
  environment?: string;
}

export function getSavedChromiumPath(): string | null {
  try {
    if (fs.existsSync(CHROMIUM_CONFIG_PATH)) {
      const config: ChromiumConfig = JSON.parse(fs.readFileSync(CHROMIUM_CONFIG_PATH, "utf-8"));
      if (config.path && fs.existsSync(config.path)) {
        return config.path;
      }
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

export function saveChromiumPath(chromiumPath: string, version: string): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const config: ChromiumConfig = {
      path: chromiumPath,
      version,
      cacheDir: getPuppeteerCacheDir(),
      installedAt: new Date().toISOString(),
      environment: process.env.RENDER ? "render" : "local",
    };
    fs.writeFileSync(CHROMIUM_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`Chromium path saved to: ${CHROMIUM_CONFIG_PATH}`);
  } catch (e) {
    console.error("Failed to save Chromium path:", e);
  }
}

export function getCachedChromiumPath(): string | null {
  return cachedChromiumPath;
}

export function isChromiumCheckDone(): boolean {
  return chromiumCheckDone;
}

export async function ensureChromiumInstalled(): Promise<string | null> {
  // If we already checked, return cached result
  if (chromiumCheckDone) {
    return cachedChromiumPath;
  }

  console.log("Checking for Chromium installation...");
  console.log(`Environment: ${process.env.RENDER ? "Render" : "Local/Replit"}`);
  
  // Mark as checked to prevent repeated checks
  chromiumCheckDone = true;
  
  // 1. Check saved config first
  const savedPath = getSavedChromiumPath();
  if (savedPath) {
    console.log(`Using saved Chromium path: ${savedPath}`);
    cachedChromiumPath = savedPath;
    return savedPath;
  }
  
  // 2. Check environment variable
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    console.log(`Using PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // 3. Check Render-specific persistent cache location
  if (process.env.RENDER) {
    const renderCachePath = "/opt/render/project/.cache/puppeteer";
    const chromePath = await findChromeInDirectory(renderCachePath);
    if (chromePath) {
      console.log(`Found Chrome in Render cache: ${chromePath}`);
      cachedChromiumPath = chromePath;
      return chromePath;
    }
  }
  
  // 4. Check common system paths
  const systemPaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
  ];
  
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      console.log(`Found system Chromium at: ${p}`);
      cachedChromiumPath = p;
      return p;
    }
  }
  
  // 5. Try Puppeteer's bundled Chromium
  try {
    const puppeteerPath = puppeteer.executablePath();
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      console.log(`Using Puppeteer bundled Chromium: ${puppeteerPath}`);
      cachedChromiumPath = puppeteerPath;
      return puppeteerPath;
    }
  } catch (e) {
    // Silent fail
  }
  
  // 6. Try to launch Puppeteer (only once)
  console.log("Attempting to launch Puppeteer to trigger Chromium download...");
  try {
    if (process.env.RENDER && !process.env.PUPPETEER_CACHE_DIR) {
      process.env.PUPPETEER_CACHE_DIR = "/opt/render/project/.cache/puppeteer";
    }
    
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
    const executablePath = browser.process()?.spawnfile;
    await browser.close();
    
    if (executablePath && fs.existsSync(executablePath)) {
      console.log(`Chromium available at: ${executablePath} (Version: ${version})`);
      saveChromiumPath(executablePath, version);
      cachedChromiumPath = executablePath;
      return executablePath;
    }
  } catch (launchError: any) {
    console.error("Failed to launch Chromium:", launchError.message);
  }
  
  console.error("No Chromium installation found. Browser automation will not work.");
  console.log("Troubleshooting tips:");
  console.log("  1. On Render: Set PUPPETEER_CACHE_DIR=/opt/render/project/.cache/puppeteer");
  console.log("  2. Use ./render-build.sh as your build command");
  console.log("  3. Ensure postinstall script runs during npm install");
  
  return null;
}

async function findChromeInDirectory(dir: string): Promise<string | null> {
  try {
    if (!fs.existsSync(dir)) {
      return null;
    }
    
    const chromeDir = path.join(dir, "chrome");
    if (!fs.existsSync(chromeDir)) {
      return null;
    }
    
    const entries = fs.readdirSync(chromeDir);
    for (const entry of entries) {
      if (entry.startsWith("linux-")) {
        const chromePath = path.join(chromeDir, entry, "chrome-linux64", "chrome");
        if (fs.existsSync(chromePath)) {
          return chromePath;
        }
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

export async function validateChromiumPath(executablePath: string): Promise<boolean> {
  if (!executablePath || !fs.existsSync(executablePath)) {
    return false;
  }
  
  try {
    const browser = await puppeteer.launch({
      executablePath,
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
    
    await browser.close();
    return true;
  } catch (e) {
    return false;
  }
}
