import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import logger from './logger';

const COMMON_CHROMIUM_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

function findWithWhich(): string | undefined {
  try {
    const result = execSync('which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function findNixChromium(): string | undefined {
  try {
    if (!fs.existsSync('/nix/store')) return undefined;
    
    const entries = fs.readdirSync('/nix/store');
    for (const entry of entries) {
      if (entry.includes('chromium')) {
        const binPath = path.join('/nix/store', entry, 'bin', 'chromium');
        if (fs.existsSync(binPath)) {
          return binPath;
        }
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function tryGetPuppeteerPath(): string | undefined {
  try {
    const puppeteer = require('puppeteer');
    const execPath = puppeteer.executablePath();
    if (execPath && fs.existsSync(execPath)) {
      return execPath;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function resolveChromiumPath(): string | undefined {
  if (process.env.CHROMIUM_PATH && fs.existsSync(process.env.CHROMIUM_PATH)) {
    logger.info(`Using Chromium from CHROMIUM_PATH: ${process.env.CHROMIUM_PATH}`);
    return process.env.CHROMIUM_PATH;
  }

  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    logger.info(`Using Chromium from PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const whichPath = findWithWhich();
  if (whichPath) {
    logger.info(`Using system Chromium: ${whichPath}`);
    return whichPath;
  }

  for (const chromiumPath of COMMON_CHROMIUM_PATHS) {
    if (fs.existsSync(chromiumPath)) {
      logger.info(`Found Chromium at: ${chromiumPath}`);
      return chromiumPath;
    }
  }

  const nixPath = findNixChromium();
  if (nixPath) {
    logger.info(`Found Nix Chromium: ${nixPath}`);
    return nixPath;
  }

  const puppeteerPath = tryGetPuppeteerPath();
  if (puppeteerPath) {
    logger.info(`Using Puppeteer bundled Chromium: ${puppeteerPath}`);
    return puppeteerPath;
  }

  logger.warn('No Chromium found. Browser automation will not work.');
  return undefined;
}

export function getPuppeteerArgs(): string[] {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
  ];

  if (process.env.PUPPETEER_EXTRA_ARGS) {
    const extraArgs = process.env.PUPPETEER_EXTRA_ARGS.split(',').filter(Boolean);
    args.push(...extraArgs);
  }

  return args;
}
