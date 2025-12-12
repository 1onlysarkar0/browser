import puppeteer, { Browser, Page } from "puppeteer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import type { Action, Url, Recording } from "@shared/schema";
import { ensureChromiumInstalled, getSavedChromiumPath, validateChromiumPath, getCachedChromiumPath, isChromiumCheckDone } from "./chromium-installer";

const DATA_DIR = process.env.DATA_DIR || "./data";
const SCREENSHOTS_DIR = path.join(DATA_DIR, "screenshots");

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

let activeBrowsers = 0;
let cachedChromiumPath: string | null = null;
const scheduledJobs: Map<number, NodeJS.Timeout> = new Map();

export async function initializeChromium(): Promise<void> {
  console.log("Initializing Chromium...");
  cachedChromiumPath = await ensureChromiumInstalled();
  if (cachedChromiumPath) {
    console.log(`Chromium initialized at: ${cachedChromiumPath}`);
    const settings = storage.getSettings();
    if (!settings.chromiumPath || !fs.existsSync(settings.chromiumPath)) {
      storage.updateSettings({ chromiumPath: cachedChromiumPath });
      console.log("Updated settings with detected Chromium path");
    }
  } else {
    console.warn("Chromium not available - browser automation will not work");
  }
}

// Session manager for live recording sessions
interface RecordingSession {
  browser: Browser;
  page: Page;
  urlId: number;
  createdAt: number;
  lastActivity: number;
}

const activeSessions: Map<number, RecordingSession> = new Map();
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity

// Cleanup inactive sessions periodically
setInterval(async () => {
  const now = Date.now();
  const sessionEntries = Array.from(activeSessions.entries());
  for (const [urlId, session] of sessionEntries) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`Closing inactive session for URL ${urlId}`);
      try {
        await session.browser.close().catch(() => {});
        activeSessions.delete(urlId);
        activeBrowsers = Math.max(0, activeBrowsers - 1);
        console.log(`Cleaned up inactive session for URL ${urlId}`);
      } catch (err) {
        console.error(`Failed to cleanup session for URL ${urlId}:`, err);
        activeSessions.delete(urlId);
      }
    }
  }
}, 60 * 1000); // Check every minute

export function getActiveBrowsers(): number {
  return activeBrowsers;
}

export function getScheduledTasksCount(): number {
  return scheduledJobs.size;
}

export async function detectChromiumPath(): Promise<string | null> {
  // 1. Use local cached path if available and valid
  if (cachedChromiumPath && fs.existsSync(cachedChromiumPath)) {
    return cachedChromiumPath;
  }
  
  // 2. Use installer's cached path
  const installerCached = getCachedChromiumPath();
  if (installerCached && fs.existsSync(installerCached)) {
    cachedChromiumPath = installerCached;
    return installerCached;
  }
  
  // 3. Check saved config
  const savedPath = getSavedChromiumPath();
  if (savedPath) {
    cachedChromiumPath = savedPath;
    return savedPath;
  }
  
  // 4. Check environment variable
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    cachedChromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  // 5. Check common system paths (quick check, no heavy operations)
  const possiblePaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      cachedChromiumPath = p;
      return p;
    }
  }

  // 6. Try Puppeteer's bundled Chromium
  try {
    const puppeteerPath = puppeteer.executablePath();
    if (puppeteerPath && fs.existsSync(puppeteerPath)) {
      cachedChromiumPath = puppeteerPath;
      return puppeteerPath;
    }
  } catch (e) {}

  // 7. Only try ensureChromiumInstalled if not already checked (prevents repeated checks)
  if (!isChromiumCheckDone()) {
    const installedPath = await ensureChromiumInstalled();
    if (installedPath) {
      cachedChromiumPath = installedPath;
      return installedPath;
    }
  }

  // No Chromium found
  return null;
}

export async function testChromium(executablePath: string): Promise<{ success: boolean; message: string }> {
  if (!executablePath) {
    return { success: false, message: "No Chromium path provided" };
  }

  if (!fs.existsSync(executablePath)) {
    return { success: false, message: `File not found: ${executablePath}` };
  }

  let browser: Browser | null = null;
  try {
    activeBrowsers++;
    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.goto("about:blank");
    const version = await browser.version();
    
    return { success: true, message: `Chromium working! Version: ${version}` };
  } catch (error: any) {
    return { success: false, message: `Failed to launch Chromium: ${error.message}` };
  } finally {
    activeBrowsers--;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function runPlayback(
  url: Url,
  recording: Recording,
  actions: Action[]
): Promise<{ success: boolean; screenshotPath?: string; error?: string }> {
  const settings = storage.getSettings();
  const executablePath = settings.chromiumPath || (await detectChromiumPath());

  if (!executablePath) {
    return { success: false, error: "Chromium not configured" };
  }

  if (activeBrowsers >= settings.maxConcurrentBrowsers) {
    return { success: false, error: "Maximum concurrent browsers reached" };
  }

  let browser: Browser | null = null;
  let executionId: number | null = null;

  try {
    activeBrowsers++;

    const execution = storage.createExecution({
      urlId: url.id,
      recordingId: recording.id,
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
      actionsCompleted: 0,
      totalActions: actions.length,
    });
    executionId = execution.id;

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--js-flags=--max-old-space-size=256",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url.url, { waitUntil: "networkidle2", timeout: 30000 });

    let actionsCompleted = 0;

    for (const action of actions) {
      try {
        const delay = Math.max(100, action.timestamp / url.speedMultiplier);
        await new Promise((r) => setTimeout(r, Math.min(delay, 2000)));

        switch (action.type) {
          case "click":
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.click(action.selector);
            }
            break;
          case "type":
            if (action.selector && action.value) {
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.type(action.selector, action.value);
            }
            break;
          case "scroll":
            const scrollY = action.scrollY ?? 0;
            await page.evaluate((y) => window.scrollBy(0, y), scrollY);
            break;
          case "hover":
            if (action.selector) {
              await page.waitForSelector(action.selector, { timeout: 5000 });
              await page.hover(action.selector);
            }
            break;
          case "wait":
            const waitTime = parseInt(action.value || "1000");
            await new Promise((r) => setTimeout(r, waitTime));
            break;
          case "navigate":
            if (action.value) {
              await page.goto(action.value, { waitUntil: "networkidle2" });
            }
            break;
        }

        actionsCompleted++;
        storage.updateExecution(executionId, { actionsCompleted });
      } catch (actionError: any) {
        console.error(`Action failed: ${action.type}`, actionError.message);
      }
    }

    let screenshotPath: string | undefined;
    if (url.captureScreenshots) {
      const filename = `screenshot_${url.id}_${Date.now()}.png`;
      screenshotPath = path.join(SCREENSHOTS_DIR, filename);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      storage.createScreenshot({
        executionId: executionId!,
        urlId: url.id,
        filename,
        filepath: screenshotPath,
      });
    }

    storage.updateExecution(executionId, {
      status: "success",
      completedAt: new Date().toISOString(),
      actionsCompleted,
    });

    return { success: true, screenshotPath };
  } catch (error: any) {
    if (executionId) {
      storage.updateExecution(executionId, {
        status: "failed",
        completedAt: new Date().toISOString(),
        errorMessage: error.message,
      });
    }
    return { success: false, error: error.message };
  } finally {
    activeBrowsers--;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export function scheduleUrl(url: Url): void {
  if (scheduledJobs.has(url.id)) {
    clearInterval(scheduledJobs.get(url.id)!);
    scheduledJobs.delete(url.id);
  }

  if (!url.isActive) {
    return;
  }

  const recordings = storage.getRecordings(url.id);
  if (recordings.length === 0) {
    return;
  }

  const latestRecording = recordings[0];
  const actions = storage.getActions(latestRecording.id);

  const intervalMs = url.intervalSeconds * 1000;
  
  const job = setInterval(async () => {
    const currentUrl = storage.getUrl(url.id);
    if (!currentUrl || !currentUrl.isActive) {
      clearInterval(job);
      scheduledJobs.delete(url.id);
      return;
    }

    await runPlayback(currentUrl, latestRecording, actions);
  }, intervalMs);

  scheduledJobs.set(url.id, job);
}

export function unscheduleUrl(urlId: number): void {
  if (scheduledJobs.has(urlId)) {
    clearInterval(scheduledJobs.get(urlId)!);
    scheduledJobs.delete(urlId);
  }
}

export function initializeScheduler(): void {
  const urls = storage.getUrls();
  for (const url of urls) {
    if (url.isActive) {
      scheduleUrl(url);
    }
  }
}

export async function capturePageScreenshot(url: string): Promise<{ success: boolean; data?: string; error?: string }> {
  const settings = storage.getSettings();
  const executablePath = settings.chromiumPath || (await detectChromiumPath());

  if (!executablePath) {
    return { success: false, error: "Chromium not configured" };
  }

  let browser: Browser | null = null;

  try {
    activeBrowsers++;

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
        "--no-zygote",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const screenshotBuffer = await page.screenshot({ encoding: "base64", fullPage: false });
    
    return { success: true, data: screenshotBuffer as string };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    activeBrowsers--;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function captureManualScreenshot(urlId: number): Promise<{ success: boolean; path?: string; error?: string }> {
  const url = storage.getUrl(urlId);
  if (!url) {
    return { success: false, error: "URL not found" };
  }

  const settings = storage.getSettings();
  const executablePath = settings.chromiumPath || (await detectChromiumPath());

  if (!executablePath) {
    return { success: false, error: "Chromium not configured" };
  }

  let browser: Browser | null = null;

  try {
    activeBrowsers++;

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
        "--no-zygote",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url.url, { waitUntil: "networkidle2", timeout: 30000 });

    const filename = `manual_${url.id}_${Date.now()}.png`;
    const screenshotPath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    const execution = storage.createExecution({
      urlId: url.id,
      recordingId: null,
      status: "success",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      errorMessage: null,
      actionsCompleted: 0,
      totalActions: 0,
    });

    storage.createScreenshot({
      executionId: execution.id,
      urlId: url.id,
      filename,
      filepath: screenshotPath,
    });

    return { success: true, path: screenshotPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    activeBrowsers--;
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ============ Live Session Management for Recording ============

export async function startSession(urlId: number): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  // Close existing session for this URL if any
  if (activeSessions.has(urlId)) {
    const existingSession = activeSessions.get(urlId)!;
    try {
      await existingSession.browser.close().catch(() => {});
      activeSessions.delete(urlId);
      activeBrowsers = Math.max(0, activeBrowsers - 1);
    } catch (err) {
      console.error(`Failed to close existing session for URL ${urlId}:`, err);
      activeSessions.delete(urlId);
    }
  }

  // Only allow one recording session at a time for memory efficiency
  if (activeSessions.size > 0) {
    // Close all existing sessions first
    const sessionEntries = Array.from(activeSessions.entries());
    for (const [existingUrlId, session] of sessionEntries) {
      try {
        await session.browser.close().catch(() => {});
        activeSessions.delete(existingUrlId);
        activeBrowsers = Math.max(0, activeBrowsers - 1);
        console.log(`Closed existing session for URL ${existingUrlId} to make room`);
      } catch (err) {
        activeSessions.delete(existingUrlId);
      }
    }
  }

  const url = storage.getUrl(urlId);
  if (!url) {
    return { success: false, error: "URL not found" };
  }

  const settings = storage.getSettings();
  const executablePath = settings.chromiumPath || (await detectChromiumPath());

  if (!executablePath) {
    return { success: false, error: "Chromium not configured" };
  }

  // Double-check we have capacity after cleanup
  if (activeBrowsers >= settings.maxConcurrentBrowsers) {
    return { success: false, error: "Maximum concurrent browsers reached. Close other sessions first." };
  }

  try {
    activeBrowsers++;

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
        "--js-flags=--max-old-space-size=256",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url.url, { waitUntil: "networkidle2", timeout: 30000 });

    const now = Date.now();
    activeSessions.set(urlId, {
      browser,
      page,
      urlId,
      createdAt: now,
      lastActivity: now,
    });

    // Capture initial screenshot
    const screenshotBuffer = await page.screenshot({ encoding: "base64", fullPage: false });

    console.log(`Started recording session for URL ${urlId}`);
    return { success: true, screenshot: screenshotBuffer as string };
  } catch (error: any) {
    activeBrowsers--;
    return { success: false, error: error.message };
  }
}

export async function closeSession(urlId: number): Promise<{ success: boolean; error?: string }> {
  const session = activeSessions.get(urlId);
  if (!session) {
    return { success: false, error: "No active session found" };
  }

  try {
    await session.browser.close().catch(() => {});
    activeSessions.delete(urlId);
    activeBrowsers--;
    console.log(`Closed recording session for URL ${urlId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function hasActiveSession(urlId: number): boolean {
  return activeSessions.has(urlId);
}

export async function executeSessionAction(
  urlId: number,
  action: { type: string; selector?: string; value?: string; scrollX?: number; scrollY?: number }
): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  const session = activeSessions.get(urlId);
  if (!session) {
    return { success: false, error: "No active session. Start a session first." };
  }

  const { page } = session;
  session.lastActivity = Date.now();

  try {
    switch (action.type) {
      case "click":
        if (!action.selector) {
          return { success: false, error: "Click action requires a selector" };
        }
        await page.waitForSelector(action.selector, { timeout: 5000 });
        await page.click(action.selector);
        break;
      case "type":
        if (!action.selector) {
          return { success: false, error: "Type action requires a selector" };
        }
        await page.waitForSelector(action.selector, { timeout: 5000 });
        await page.type(action.selector, action.value || "");
        break;
      case "scroll":
        const scrollAmount = action.scrollY ?? (action.value ? parseInt(action.value) : 0) ?? 0;
        await page.evaluate((y) => window.scrollBy(0, y), scrollAmount);
        break;
      case "hover":
        if (!action.selector) {
          return { success: false, error: "Hover action requires a selector" };
        }
        await page.waitForSelector(action.selector, { timeout: 5000 });
        await page.hover(action.selector);
        break;
      case "wait":
        const waitTime = action.value ? parseInt(action.value) : 1000;
        await new Promise((r) => setTimeout(r, isNaN(waitTime) ? 1000 : waitTime));
        break;
      case "navigate":
        if (!action.value) {
          return { success: false, error: "Navigate action requires a URL" };
        }
        await page.goto(action.value, { waitUntil: "networkidle2", timeout: 30000 });
        break;
      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }

    // Wait a moment for page to stabilize
    await new Promise((r) => setTimeout(r, 300));

    // Capture screenshot after action
    const screenshotBuffer = await page.screenshot({ encoding: "base64", fullPage: false });

    return { success: true, screenshot: screenshotBuffer as string };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSessionScreenshot(urlId: number): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  const session = activeSessions.get(urlId);
  if (!session) {
    return { success: false, error: "No active session" };
  }

  try {
    session.lastActivity = Date.now();
    const screenshotBuffer = await session.page.screenshot({ encoding: "base64", fullPage: false });
    return { success: true, screenshot: screenshotBuffer as string };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
