"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveChromiumPath = resolveChromiumPath;
exports.getPuppeteerArgs = getPuppeteerArgs;
exports.getPuppeteerConfig = getPuppeteerConfig;
exports.validateChromiumSetup = validateChromiumSetup;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const logger_1 = __importDefault(require("./logger"));
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
    path_1.default.join(process.env.HOME || '', '.cache', 'puppeteer'),
    path_1.default.join(process.cwd(), '.cache', 'puppeteer'),
    path_1.default.join(process.cwd(), 'node_modules', 'puppeteer', '.local-chromium'),
    '/root/.cache/puppeteer',
];
function isRenderEnvironment() {
    return !!(process.env.RENDER ||
        process.env.RENDER_SERVICE_ID ||
        process.env.RENDER_EXTERNAL_HOSTNAME ||
        process.env.IS_PULL_REQUEST !== undefined ||
        (process.cwd() && process.cwd().includes('/opt/render')));
}
function isRailwayEnvironment() {
    return !!(process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_PROJECT_ID ||
        process.env.RAILWAY_SERVICE_ID);
}
function isHerokuEnvironment() {
    return !!(process.env.DYNO ||
        process.env.HEROKU_APP_NAME);
}
function isDockerEnvironment() {
    try {
        return fs_1.default.existsSync('/.dockerenv') ||
            (fs_1.default.existsSync('/proc/1/cgroup') &&
                fs_1.default.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));
    }
    catch {
        return false;
    }
}
function findWithWhich() {
    const commands = [
        'which chromium 2>/dev/null',
        'which chromium-browser 2>/dev/null',
        'which google-chrome 2>/dev/null',
        'which google-chrome-stable 2>/dev/null',
    ];
    for (const cmd of commands) {
        try {
            const result = (0, child_process_1.execSync)(cmd, {
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 5000
            }).trim();
            if (result && fs_1.default.existsSync(result)) {
                return result;
            }
        }
        catch {
            continue;
        }
    }
    return undefined;
}
function findNixChromium() {
    try {
        if (!fs_1.default.existsSync('/nix/store'))
            return undefined;
        const entries = fs_1.default.readdirSync('/nix/store');
        const chromiumEntries = entries.filter(entry => entry.includes('chromium') && !entry.includes('.drv')).sort().reverse();
        for (const entry of chromiumEntries) {
            const binPath = path_1.default.join('/nix/store', entry, 'bin', 'chromium');
            if (fs_1.default.existsSync(binPath)) {
                return binPath;
            }
            const altBinPath = path_1.default.join('/nix/store', entry, 'bin', 'chromium-browser');
            if (fs_1.default.existsSync(altBinPath)) {
                return altBinPath;
            }
        }
    }
    catch {
        return undefined;
    }
    return undefined;
}
function tryGetPuppeteerPath() {
    try {
        const puppeteer = require('puppeteer');
        const execPath = puppeteer.executablePath();
        if (execPath && fs_1.default.existsSync(execPath)) {
            return execPath;
        }
    }
    catch (error) {
        logger_1.default.debug(`Puppeteer path lookup failed: ${error.message}`);
    }
    return undefined;
}
function findPuppeteerCacheChromium() {
    logger_1.default.info('Searching Puppeteer cache directories for Chrome...');
    for (const cacheDir of PUPPETEER_CACHE_DIRS) {
        if (!fs_1.default.existsSync(cacheDir))
            continue;
        logger_1.default.info(`Checking Puppeteer cache: ${cacheDir}`);
        try {
            const chromeDir = path_1.default.join(cacheDir, 'chrome');
            if (fs_1.default.existsSync(chromeDir)) {
                const versions = fs_1.default.readdirSync(chromeDir);
                for (const version of versions.sort().reverse()) {
                    const chromePaths = [
                        path_1.default.join(chromeDir, version, 'chrome-linux64', 'chrome'),
                        path_1.default.join(chromeDir, version, 'chrome-linux', 'chrome'),
                        path_1.default.join(chromeDir, version, 'chrome-win', 'chrome.exe'),
                        path_1.default.join(chromeDir, version, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
                    ];
                    for (const chromePath of chromePaths) {
                        if (fs_1.default.existsSync(chromePath)) {
                            logger_1.default.info(`Found Chrome in Puppeteer cache: ${chromePath}`);
                            return chromePath;
                        }
                    }
                }
            }
            const entries = fs_1.default.readdirSync(cacheDir);
            for (const entry of entries) {
                if (entry.startsWith('linux-') || entry.startsWith('chrome')) {
                    const entryPath = path_1.default.join(cacheDir, entry);
                    const chromePaths = [
                        path_1.default.join(entryPath, 'chrome-linux64', 'chrome'),
                        path_1.default.join(entryPath, 'chrome-linux', 'chrome'),
                        path_1.default.join(entryPath, 'chrome'),
                    ];
                    for (const chromePath of chromePaths) {
                        if (fs_1.default.existsSync(chromePath)) {
                            logger_1.default.info(`Found Chrome in Puppeteer cache: ${chromePath}`);
                            return chromePath;
                        }
                    }
                }
            }
        }
        catch (error) {
            logger_1.default.debug(`Error searching ${cacheDir}: ${error.message}`);
        }
    }
    return undefined;
}
function findRenderChromium() {
    for (const chromePath of RENDER_CHROMIUM_PATHS) {
        if (fs_1.default.existsSync(chromePath)) {
            return chromePath;
        }
    }
    const puppeteerCachePath = findPuppeteerCacheChromium();
    if (puppeteerCachePath) {
        return puppeteerCachePath;
    }
    return undefined;
}
function findChromiumRecursively(baseDir, maxDepth = 3) {
    if (maxDepth <= 0 || !fs_1.default.existsSync(baseDir))
        return undefined;
    try {
        const entries = fs_1.default.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isFile()) {
                const lowerName = entry.name.toLowerCase();
                if (lowerName === 'chrome' || lowerName === 'chromium' ||
                    lowerName === 'google-chrome' || lowerName === 'chromium-browser') {
                    const fullPath = path_1.default.join(baseDir, entry.name);
                    try {
                        fs_1.default.accessSync(fullPath, fs_1.default.constants.X_OK);
                        return fullPath;
                    }
                    catch {
                        continue;
                    }
                }
            }
        }
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const result = findChromiumRecursively(path_1.default.join(baseDir, entry.name), maxDepth - 1);
                if (result)
                    return result;
            }
        }
    }
    catch {
        // Ignore permission errors
    }
    return undefined;
}
function resolveChromiumPath() {
    logger_1.default.info('Starting Chromium path resolution...');
    if (process.env.CHROMIUM_PATH) {
        if (fs_1.default.existsSync(process.env.CHROMIUM_PATH)) {
            logger_1.default.info(`Using Chromium from CHROMIUM_PATH: ${process.env.CHROMIUM_PATH}`);
            return process.env.CHROMIUM_PATH;
        }
        logger_1.default.warn(`CHROMIUM_PATH set but path doesn't exist: ${process.env.CHROMIUM_PATH}`);
    }
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        if (fs_1.default.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            logger_1.default.info(`Using Chromium from PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
            return process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        logger_1.default.warn(`PUPPETEER_EXECUTABLE_PATH set but path doesn't exist: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    }
    if (process.env.GOOGLE_CHROME_BIN && fs_1.default.existsSync(process.env.GOOGLE_CHROME_BIN)) {
        logger_1.default.info(`Using Chromium from GOOGLE_CHROME_BIN: ${process.env.GOOGLE_CHROME_BIN}`);
        return process.env.GOOGLE_CHROME_BIN;
    }
    const envInfo = {
        isRender: isRenderEnvironment(),
        isRailway: isRailwayEnvironment(),
        isHeroku: isHerokuEnvironment(),
        isDocker: isDockerEnvironment(),
        nodeEnv: process.env.NODE_ENV
    };
    logger_1.default.info(`Environment detection: ${JSON.stringify(envInfo)}`);
    if (isRenderEnvironment()) {
        logger_1.default.info('Detected Render environment, checking Render-specific paths...');
        const renderPath = findRenderChromium();
        if (renderPath) {
            logger_1.default.info(`Found Render Chromium at: ${renderPath}`);
            return renderPath;
        }
    }
    const puppeteerPath = tryGetPuppeteerPath();
    if (puppeteerPath) {
        logger_1.default.info(`Using Puppeteer bundled Chromium: ${puppeteerPath}`);
        return puppeteerPath;
    }
    const puppeteerCachePath = findPuppeteerCacheChromium();
    if (puppeteerCachePath) {
        logger_1.default.info(`Found Chrome in Puppeteer cache: ${puppeteerCachePath}`);
        return puppeteerCachePath;
    }
    const whichPath = findWithWhich();
    if (whichPath) {
        logger_1.default.info(`Using system Chromium: ${whichPath}`);
        return whichPath;
    }
    for (const chromiumPath of COMMON_CHROMIUM_PATHS) {
        if (fs_1.default.existsSync(chromiumPath)) {
            logger_1.default.info(`Found Chromium at: ${chromiumPath}`);
            return chromiumPath;
        }
    }
    const nixPath = findNixChromium();
    if (nixPath) {
        logger_1.default.info(`Found Nix Chromium: ${nixPath}`);
        return nixPath;
    }
    const searchDirs = [
        '/opt',
        '/usr/local',
        process.cwd(),
        path_1.default.join(process.cwd(), 'node_modules'),
    ];
    for (const dir of searchDirs) {
        const found = findChromiumRecursively(dir, 4);
        if (found) {
            logger_1.default.info(`Found Chromium via recursive search: ${found}`);
            return found;
        }
    }
    logger_1.default.warn('No Chromium found after exhaustive search. Browser automation may not work.');
    logger_1.default.warn('Consider setting PUPPETEER_EXECUTABLE_PATH or CHROMIUM_PATH environment variable.');
    return undefined;
}
function getPuppeteerArgs() {
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
        args.push('--disable-software-rasterizer', '--disable-extensions', '--disable-default-apps', '--mute-audio', '--hide-scrollbars');
    }
    if (process.env.PUPPETEER_EXTRA_ARGS) {
        const extraArgs = process.env.PUPPETEER_EXTRA_ARGS.split(',')
            .map(arg => arg.trim())
            .filter(Boolean);
        args.push(...extraArgs);
    }
    return args;
}
function getPuppeteerConfig() {
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
function validateChromiumSetup() {
    try {
        const chromePath = resolveChromiumPath();
        if (!chromePath) {
            return {
                valid: false,
                error: 'No Chromium/Chrome installation found. Please install Chromium or set PUPPETEER_EXECUTABLE_PATH.'
            };
        }
        if (!fs_1.default.existsSync(chromePath)) {
            return {
                valid: false,
                error: `Chromium path exists but file not found: ${chromePath}`
            };
        }
        try {
            fs_1.default.accessSync(chromePath, fs_1.default.constants.X_OK);
        }
        catch {
            return {
                valid: false,
                error: `Chromium found but not executable: ${chromePath}`
            };
        }
        return { valid: true, path: chromePath };
    }
    catch (error) {
        return { valid: false, error: `Chromium validation failed: ${error.message}` };
    }
}
//# sourceMappingURL=chromium.js.map