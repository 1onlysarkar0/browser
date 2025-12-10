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
  '/opt/google/chrome/chrome',
  '/opt/google/chrome/google-chrome',
  '/opt/chromium/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
];

const RENDER_CHROMIUM_PATHS = [
  '/opt/render/project/.render/chrome/opt/google/chrome/chrome',
  '/opt/render/project/.render/chrome/opt/google/chrome/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
];

const PUPPETEER_CACHE_DIRS = [
  '/opt/render/.cache/puppeteer',
  path.join(process.env.HOME || '', '.cache', 'puppeteer'),
  path.join(process.cwd(), '.cache', 'puppeteer'),
  path.join(process.cwd(), 'node_modules', 'puppeteer', '.local-chromium'),
  '/root/.cache/puppeteer',
];

function isRenderEnvironment(): boolean {
  return !!(
    process.env.RENDER ||
    process.env.RENDER_SERVICE_ID ||
    process.env.RENDER_EXTERNAL_HOSTNAME ||
    process.env.IS_PULL_REQUEST !== undefined ||
    (process.cwd() && process.cwd().includes('/opt/render'))
  );
}

function isRailwayEnvironment(): boolean {
  return !!(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID
  );
}

function isHerokuEnvironment(): boolean {
  return !!(
    process.env.DYNO ||
    process.env.HEROKU_APP_NAME
  );
}

function isDockerEnvironment(): boolean {
  try {
    return fs.existsSync('/.dockerenv') || 
           (fs.existsSync('/proc/1/cgroup') && 
            fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));
  } catch {
    return false;
  }
}

function findWithWhich(): string | undefined {
  const commands = [
    'which chromium 2>/dev/null',
    'which chromium-browser 2>/dev/null',
    'which google-chrome 2>/dev/null',
    'which google-chrome-stable 2>/dev/null',
  ];
  
  for (const cmd of commands) {
    try {
      const result = execSync(cmd, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000
      }).trim();
      if (result && fs.existsSync(result)) {
        return result;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function findNixChromium(): string | undefined {
  try {
    if (!fs.existsSync('/nix/store')) return undefined;
    
    const entries = fs.readdirSync('/nix/store');
    const chromiumEntries = entries.filter(entry => 
      entry.includes('chromium') && !entry.includes('.drv')
    ).sort().reverse();
    
    for (const entry of chromiumEntries) {
      const binPath = path.join('/nix/store', entry, 'bin', 'chromium');
      if (fs.existsSync(binPath)) {
        return binPath;
      }
      const altBinPath = path.join('/nix/store', entry, 'bin', 'chromium-browser');
      if (fs.existsSync(altBinPath)) {
        return altBinPath;
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
  } catch (error: any) {
    logger.debug(`Puppeteer path lookup failed: ${error.message}`);
  }
  return undefined;
}

function findPuppeteerCacheChromium(): string | undefined {
  logger.info('Searching Puppeteer cache directories for Chrome...');
  
  for (const cacheDir of PUPPETEER_CACHE_DIRS) {
    if (!fs.existsSync(cacheDir)) continue;
    
    logger.info(`Checking Puppeteer cache: ${cacheDir}`);
    
    try {
      const chromeDir = path.join(cacheDir, 'chrome');
      if (fs.existsSync(chromeDir)) {
        const versions = fs.readdirSync(chromeDir);
        for (const version of versions.sort().reverse()) {
          const chromePaths = [
            path.join(chromeDir, version, 'chrome-linux64', 'chrome'),
            path.join(chromeDir, version, 'chrome-linux', 'chrome'),
            path.join(chromeDir, version, 'chrome-win', 'chrome.exe'),
            path.join(chromeDir, version, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          ];
          
          for (const chromePath of chromePaths) {
            if (fs.existsSync(chromePath)) {
              logger.info(`Found Chrome in Puppeteer cache: ${chromePath}`);
              return chromePath;
            }
          }
        }
      }
      
      const entries = fs.readdirSync(cacheDir);
      for (const entry of entries) {
        if (entry.startsWith('linux-') || entry.startsWith('chrome')) {
          const entryPath = path.join(cacheDir, entry);
          const chromePaths = [
            path.join(entryPath, 'chrome-linux64', 'chrome'),
            path.join(entryPath, 'chrome-linux', 'chrome'),
            path.join(entryPath, 'chrome'),
          ];
          
          for (const chromePath of chromePaths) {
            if (fs.existsSync(chromePath)) {
              logger.info(`Found Chrome in Puppeteer cache: ${chromePath}`);
              return chromePath;
            }
          }
        }
      }
    } catch (error: any) {
      logger.debug(`Error searching ${cacheDir}: ${error.message}`);
    }
  }
  
  return undefined;
}

function findRenderChromium(): string | undefined {
  for (const chromePath of RENDER_CHROMIUM_PATHS) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  const puppeteerCachePath = findPuppeteerCacheChromium();
  if (puppeteerCachePath) {
    return puppeteerCachePath;
  }
  
  return undefined;
}

function findChromiumRecursively(baseDir: string, maxDepth: number = 3): string | undefined {
  if (maxDepth <= 0 || !fs.existsSync(baseDir)) return undefined;
  
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        if (lowerName === 'chrome' || lowerName === 'chromium' || 
            lowerName === 'google-chrome' || lowerName === 'chromium-browser') {
          const fullPath = path.join(baseDir, entry.name);
          try {
            fs.accessSync(fullPath, fs.constants.X_OK);
            return fullPath;
          } catch {
            continue;
          }
        }
      }
    }
    
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const result = findChromiumRecursively(path.join(baseDir, entry.name), maxDepth - 1);
        if (result) return result;
      }
    }
  } catch {
    // Ignore permission errors
  }
  
  return undefined;
}

export function resolveChromiumPath(): string | undefined {
  logger.info('Starting Chromium path resolution...');
  
  if (process.env.CHROMIUM_PATH) {
    if (fs.existsSync(process.env.CHROMIUM_PATH)) {
      logger.info(`Using Chromium from CHROMIUM_PATH: ${process.env.CHROMIUM_PATH}`);
      return process.env.CHROMIUM_PATH;
    }
    logger.warn(`CHROMIUM_PATH set but path doesn't exist: ${process.env.CHROMIUM_PATH}`);
  }

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      logger.info(`Using Chromium from PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    logger.warn(`PUPPETEER_EXECUTABLE_PATH set but path doesn't exist: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
  }

  if (process.env.GOOGLE_CHROME_BIN && fs.existsSync(process.env.GOOGLE_CHROME_BIN)) {
    logger.info(`Using Chromium from GOOGLE_CHROME_BIN: ${process.env.GOOGLE_CHROME_BIN}`);
    return process.env.GOOGLE_CHROME_BIN;
  }

  const envInfo = {
    isRender: isRenderEnvironment(),
    isRailway: isRailwayEnvironment(),
    isHeroku: isHerokuEnvironment(),
    isDocker: isDockerEnvironment(),
    nodeEnv: process.env.NODE_ENV
  };
  logger.info(`Environment detection: ${JSON.stringify(envInfo)}`);

  if (isRenderEnvironment()) {
    logger.info('Detected Render environment, checking Render-specific paths...');
    const renderPath = findRenderChromium();
    if (renderPath) {
      logger.info(`Found Render Chromium at: ${renderPath}`);
      return renderPath;
    }
  }

  const puppeteerPath = tryGetPuppeteerPath();
  if (puppeteerPath) {
    logger.info(`Using Puppeteer bundled Chromium: ${puppeteerPath}`);
    return puppeteerPath;
  }

  const puppeteerCachePath = findPuppeteerCacheChromium();
  if (puppeteerCachePath) {
    logger.info(`Found Chrome in Puppeteer cache: ${puppeteerCachePath}`);
    return puppeteerCachePath;
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

  const searchDirs = [
    '/opt',
    '/usr/local',
    process.cwd(),
    path.join(process.cwd(), 'node_modules'),
  ];
  
  for (const dir of searchDirs) {
    const found = findChromiumRecursively(dir, 4);
    if (found) {
      logger.info(`Found Chromium via recursive search: ${found}`);
      return found;
    }
  }

  logger.warn('No Chromium found after exhaustive search. Browser automation may not work.');
  logger.warn('Consider setting PUPPETEER_EXECUTABLE_PATH or CHROMIUM_PATH environment variable.');
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
    '--single-process',
    '--no-zygote',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=IsolateOrigins,site-per-process',
    '--font-render-hinting=none',
  ];

  if (isRenderEnvironment() || isDockerEnvironment()) {
    args.push(
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-default-apps',
      '--mute-audio',
      '--hide-scrollbars'
    );
  }

  if (process.env.PUPPETEER_EXTRA_ARGS) {
    const extraArgs = process.env.PUPPETEER_EXTRA_ARGS.split(',')
      .map(arg => arg.trim())
      .filter(Boolean);
    args.push(...extraArgs);
  }

  return args;
}

export function getPuppeteerConfig() {
  const executablePath = resolveChromiumPath();
  const args = getPuppeteerArgs();
  
  return {
    executablePath,
    args,
    headless: true,
    ignoreHTTPSErrors: true,
    timeout: 60000,
    protocolTimeout: 180000,
    defaultViewport: {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    },
  };
}

export function validateChromiumSetup(): { valid: boolean; path?: string; error?: string } {
  try {
    const chromePath = resolveChromiumPath();
    if (!chromePath) {
      return { 
        valid: false, 
        error: 'No Chromium/Chrome installation found. Please install Chromium or set PUPPETEER_EXECUTABLE_PATH.' 
      };
    }
    
    if (!fs.existsSync(chromePath)) {
      return { 
        valid: false, 
        error: `Chromium path exists but file not found: ${chromePath}` 
      };
    }
    
    try {
      fs.accessSync(chromePath, fs.constants.X_OK);
    } catch {
      return { 
        valid: false, 
        error: `Chromium found but not executable: ${chromePath}` 
      };
    }
    
    return { valid: true, path: chromePath };
  } catch (error: any) {
    return { valid: false, error: `Chromium validation failed: ${error.message}` };
  }
}
