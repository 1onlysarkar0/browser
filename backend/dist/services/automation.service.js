"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationService = exports.AutomationService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const config_1 = require("../config");
const logger_1 = __importDefault(require("../utils/logger"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const chromium_1 = require("../utils/chromium");
const traversal_service_1 = require("./traversal.service");
const scraper_service_1 = require("./scraper.service");
const capture_service_1 = require("./capture.service");
const change_detection_service_1 = require("./change-detection.service");
const resilience_service_1 = require("./resilience.service");
class AutomationService {
    browser = null;
    browserLock = false;
    async isBrowserConnected() {
        if (!this.browser)
            return false;
        try {
            const pages = await this.browser.pages();
            return pages !== undefined;
        }
        catch {
            return false;
        }
    }
    async initialize() {
        while (this.browserLock) {
            await this.sleep(100);
        }
        this.browserLock = true;
        try {
            const isConnected = await this.isBrowserConnected();
            if (!isConnected) {
                if (this.browser) {
                    try {
                        await this.browser.close();
                    }
                    catch {
                    }
                    this.browser = null;
                }
                const executablePath = (0, chromium_1.resolveChromiumPath)();
                const launchOptions = {
                    headless: true,
                    args: (0, chromium_1.getPuppeteerArgs)(),
                };
                if (executablePath) {
                    launchOptions.executablePath = executablePath;
                }
                try {
                    this.browser = await puppeteer_1.default.launch(launchOptions);
                    logger_1.default.info('Browser initialized successfully');
                }
                catch (error) {
                    logger_1.default.error(`Failed to launch browser: ${error.message}`);
                    throw new Error(`Browser initialization failed. Please ensure Chromium is installed or set CHROMIUM_PATH environment variable.`);
                }
            }
            return this.browser;
        }
        finally {
            this.browserLock = false;
        }
    }
    async closeBrowser() {
        if (this.browser) {
            try {
                await this.browser.close();
            }
            catch {
            }
            this.browser = null;
        }
    }
    async executeUrl(urlConfig) {
        const startTime = Date.now();
        let actionsCompleted = 0;
        let screenshotsTaken = 0;
        let pagesVisited = 0;
        let dataScraped = 0;
        let changesDetected = 0;
        let page = null;
        try {
            await this.initialize();
            if (!this.browser)
                throw new Error('Browser not initialized');
            page = await this.browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            if (urlConfig.customUserAgent) {
                await page.setUserAgent(urlConfig.customUserAgent);
            }
            if (urlConfig.customHeaders) {
                const headers = typeof urlConfig.customHeaders === 'string'
                    ? JSON.parse(urlConfig.customHeaders)
                    : urlConfig.customHeaders;
                await page.setExtraHTTPHeaders(headers);
            }
            if (urlConfig.customCookies) {
                const cookies = typeof urlConfig.customCookies === 'string'
                    ? JSON.parse(urlConfig.customCookies)
                    : urlConfig.customCookies;
                const cookieArray = Object.entries(cookies).map(([name, value]) => ({
                    name,
                    value: String(value),
                    domain: new URL(urlConfig.url).hostname,
                }));
                await page.setCookie(...cookieArray);
            }
            await resilience_service_1.resilienceService.handlePopups(page);
            logger_1.default.info(`[Auto] Navigating to ${urlConfig.url}`);
            const navSuccess = await resilience_service_1.resilienceService.safeNavigate(page, urlConfig.url);
            if (!navSuccess) {
                throw new Error(`Failed to navigate to ${urlConfig.url}`);
            }
            actionsCompleted++;
            pagesVisited++;
            await resilience_service_1.resilienceService.waitForPageStable(page);
            await resilience_service_1.resilienceService.handlePopups(page);
            if (urlConfig.javascriptCode) {
                await page.evaluate(urlConfig.javascriptCode);
                actionsCompleted++;
            }
            const interactions = typeof urlConfig.interactions === 'string'
                ? JSON.parse(urlConfig.interactions)
                : urlConfig.interactions || [];
            for (const step of interactions) {
                await this.executeStep(page, step, urlConfig);
                actionsCompleted++;
                const delay = this.getRandomDelay(urlConfig.delayBetweenActions || 1000, urlConfig.randomBehaviorVariation || 10);
                await this.sleep(delay);
            }
            if (urlConfig.changeDetection !== false) {
                const changeResult = await change_detection_service_1.changeDetectionService.detectChanges(page, urlConfig.id, urlConfig.changeThreshold || 10);
                if (changeResult.hasChanged) {
                    changesDetected++;
                    logger_1.default.info(`[Auto] Change detected: ${changeResult.changePercent.toFixed(1)}%`);
                }
            }
            if (urlConfig.autoScreenshot !== false) {
                const maxScreenshots = urlConfig.screenshotPages || 10;
                capture_service_1.captureService.resetCounter(urlConfig.id);
                const result = await capture_service_1.captureService.capturePageScreenshot(page, urlConfig.id, 0, maxScreenshots);
                if (result)
                    screenshotsTaken++;
            }
            if (urlConfig.autoScrape) {
                const scrapeSelectors = typeof urlConfig.scrapeSelectors === 'string'
                    ? JSON.parse(urlConfig.scrapeSelectors)
                    : urlConfig.scrapeSelectors || [];
                if (scrapeSelectors.length > 0) {
                    const scrapeResult = await scraper_service_1.scraperService.scrapeWithSelectors(page, urlConfig.id, scrapeSelectors);
                    dataScraped += scrapeResult.itemCount;
                }
                else {
                    const autoResult = await scraper_service_1.scraperService.autoScrape(page, urlConfig.id);
                    dataScraped += autoResult.itemCount;
                }
            }
            if (urlConfig.autoNavigate !== false) {
                const traversalResult = await this.runAutoTraversal(page, urlConfig, {
                    currentScreenshots: screenshotsTaken,
                    currentPagesVisited: pagesVisited,
                    currentDataScraped: dataScraped,
                    currentActionsCompleted: actionsCompleted,
                    currentChangesDetected: changesDetected,
                });
                screenshotsTaken += traversalResult.screenshots;
                pagesVisited += traversalResult.pagesVisited;
                dataScraped += traversalResult.dataScraped;
                actionsCompleted += traversalResult.actionsCompleted;
                changesDetected += traversalResult.changesDetected;
            }
            const duration = Date.now() - startTime;
            await prisma_1.default.executionLog.create({
                data: {
                    userId: urlConfig.userId,
                    urlId: urlConfig.id,
                    status: 'success',
                    duration,
                    actionsCompleted,
                    screenshotsTaken,
                    pagesVisited,
                    dataScraped,
                    changesDetected,
                    startedAt: new Date(startTime),
                    completedAt: new Date(),
                },
            });
            await prisma_1.default.url.update({
                where: { id: urlConfig.id },
                data: {
                    lastRunAt: new Date(),
                    successCount: { increment: 1 },
                    nextScheduledAt: new Date(Date.now() + urlConfig.runIntervalSeconds * 1000),
                },
            });
            resilience_service_1.resilienceService.recordSuccess(urlConfig.id);
            logger_1.default.info(`[Auto] Execution complete: ${pagesVisited} pages, ${screenshotsTaken} screenshots, ${dataScraped} data items`);
            return {
                success: true,
                duration,
                actionsCompleted,
                screenshotsTaken,
                pagesVisited,
                dataScraped,
                changesDetected,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.default.error(`[Auto] Execution failed for URL ${urlConfig.id}: ${error.message}`);
            resilience_service_1.resilienceService.recordFailure(urlConfig.id);
            await prisma_1.default.executionLog.create({
                data: {
                    userId: urlConfig.userId,
                    urlId: urlConfig.id,
                    status: 'error',
                    errorMessage: error.message,
                    errorStack: error.stack,
                    duration,
                    actionsCompleted,
                    screenshotsTaken,
                    pagesVisited,
                    dataScraped,
                    changesDetected,
                    startedAt: new Date(startTime),
                    completedAt: new Date(),
                },
            });
            await prisma_1.default.url.update({
                where: { id: urlConfig.id },
                data: {
                    lastErrorAt: new Date(),
                    errorCount: { increment: 1 },
                    nextScheduledAt: new Date(Date.now() + urlConfig.runIntervalSeconds * 1000),
                },
            });
            return {
                success: false,
                duration,
                actionsCompleted,
                screenshotsTaken,
                pagesVisited,
                dataScraped,
                changesDetected,
                error: error.message,
                errorStack: error.stack,
            };
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
    async runAutoTraversal(page, urlConfig, current) {
        let screenshots = 0;
        let pagesVisited = 0;
        let dataScraped = 0;
        let actionsCompleted = 0;
        let changesDetected = 0;
        const maxDepth = urlConfig.autoCrawlDepth || 3;
        const maxPages = urlConfig.maxPagesToVisit || 50;
        const maxScreenshots = urlConfig.screenshotPages || 10;
        const totalPagesVisited = current.currentPagesVisited;
        if (totalPagesVisited >= maxPages) {
            return { screenshots, pagesVisited, dataScraped, actionsCompleted, changesDetected };
        }
        const traversalConfig = {
            urlId: urlConfig.id,
            maxDepth,
            maxPages,
            followExternalLinks: urlConfig.followExternalLinks || false,
            paginationSelector: urlConfig.paginationSelector,
            baseUrl: urlConfig.url,
        };
        await traversal_service_1.traversalService.initializeQueue(traversalConfig);
        const discoveredLinks = await traversal_service_1.traversalService.discoverLinks(page, traversalConfig, 0);
        for (const link of discoveredLinks.slice(0, Math.min(5, maxPages - totalPagesVisited - 1))) {
            if (resilience_service_1.resilienceService.isCircuitOpen(urlConfig.id)) {
                logger_1.default.warn(`[Auto] Circuit breaker open, stopping traversal`);
                break;
            }
            try {
                logger_1.default.info(`[Auto] Visiting: ${link}`);
                const navSuccess = await resilience_service_1.resilienceService.safeNavigate(page, link);
                if (!navSuccess) {
                    await traversal_service_1.traversalService.markPageFailed(urlConfig.id, link);
                    continue;
                }
                pagesVisited++;
                actionsCompleted++;
                await resilience_service_1.resilienceService.waitForPageStable(page);
                await resilience_service_1.resilienceService.handlePopups(page);
                const pageInfo = await traversal_service_1.traversalService.extractPageInfo(page, 1);
                await traversal_service_1.traversalService.recordPageVisit(urlConfig.id, pageInfo);
                if (urlConfig.changeDetection !== false) {
                    const changeResult = await change_detection_service_1.changeDetectionService.detectChanges(page, urlConfig.id, urlConfig.changeThreshold || 10);
                    if (changeResult.hasChanged)
                        changesDetected++;
                }
                if (urlConfig.autoScreenshot !== false &&
                    (current.currentScreenshots + screenshots) < maxScreenshots) {
                    const result = await capture_service_1.captureService.capturePageScreenshot(page, urlConfig.id, current.currentScreenshots + screenshots, maxScreenshots);
                    if (result)
                        screenshots++;
                }
                if (urlConfig.autoScrape) {
                    const autoResult = await scraper_service_1.scraperService.autoScrape(page, urlConfig.id);
                    dataScraped += autoResult.itemCount;
                }
                await traversal_service_1.traversalService.markPageComplete(urlConfig.id, link);
                const delay = this.getRandomDelay(urlConfig.delayBetweenActions || 1000, urlConfig.randomBehaviorVariation || 10);
                await this.sleep(delay);
            }
            catch (error) {
                logger_1.default.error(`[Auto] Failed to visit ${link}: ${error.message}`);
                await traversal_service_1.traversalService.markPageFailed(urlConfig.id, link);
            }
        }
        if (urlConfig.paginationSelector) {
            let paginationCount = 0;
            const maxPagination = 5;
            while (paginationCount < maxPagination &&
                (totalPagesVisited + pagesVisited) < maxPages) {
                const hasNextPage = await traversal_service_1.traversalService.handlePagination(page, urlConfig.paginationSelector);
                if (!hasNextPage)
                    break;
                paginationCount++;
                pagesVisited++;
                actionsCompleted++;
                await resilience_service_1.resilienceService.waitForPageStable(page);
                if (urlConfig.autoScreenshot !== false &&
                    (current.currentScreenshots + screenshots) < maxScreenshots) {
                    const result = await capture_service_1.captureService.capturePageScreenshot(page, urlConfig.id, current.currentScreenshots + screenshots, maxScreenshots);
                    if (result)
                        screenshots++;
                }
                if (urlConfig.autoScrape) {
                    const autoResult = await scraper_service_1.scraperService.autoScrape(page, urlConfig.id);
                    dataScraped += autoResult.itemCount;
                }
                const delay = this.getRandomDelay(urlConfig.delayBetweenActions || 1000, urlConfig.randomBehaviorVariation || 10);
                await this.sleep(delay);
            }
        }
        return { screenshots, pagesVisited, dataScraped, actionsCompleted, changesDetected };
    }
    async executeStep(page, step, urlConfig) {
        const timeout = step.timeout || 30000;
        switch (step.type) {
            case 'navigate':
                if (step.value) {
                    await resilience_service_1.resilienceService.safeNavigate(page, step.value, { timeout });
                }
                break;
            case 'click':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    await this.humanClick(page, step.selector);
                }
                break;
            case 'doubleClick':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    await page.click(step.selector, { clickCount: 2 });
                }
                break;
            case 'rightClick':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    await page.click(step.selector, { button: 'right' });
                }
                break;
            case 'fill':
                if (step.selector && step.value !== undefined) {
                    await page.waitForSelector(step.selector, { timeout });
                    await page.click(step.selector, { clickCount: 3 });
                    await this.humanType(page, step.value);
                }
                break;
            case 'type':
                if (step.value) {
                    await this.humanType(page, step.value);
                }
                break;
            case 'press':
                if (step.value) {
                    await page.keyboard.press(step.value);
                }
                break;
            case 'selectOption':
                if (step.selector && step.value) {
                    await page.waitForSelector(step.selector, { timeout });
                    await page.select(step.selector, step.value);
                }
                break;
            case 'check':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    const isChecked = await page.$eval(step.selector, (el) => el.checked);
                    if (!isChecked) {
                        await page.click(step.selector);
                    }
                }
                break;
            case 'uncheck':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    const isChecked = await page.$eval(step.selector, (el) => el.checked);
                    if (isChecked) {
                        await page.click(step.selector);
                    }
                }
                break;
            case 'scroll':
                await this.humanScroll(page, step.xOffset || 0, step.yOffset || 0);
                break;
            case 'scrollToElement':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    await page.$eval(step.selector, (el) => el.scrollIntoView({ behavior: 'smooth' }));
                }
                break;
            case 'scrollToBottom':
                await this.humanScrollToBottom(page);
                break;
            case 'scrollToTop':
                await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
                break;
            case 'waitForSelector':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                }
                break;
            case 'waitForNavigation':
                await page.waitForNavigation({ timeout });
                break;
            case 'waitForTime':
                await this.sleep(step.delay || 1000);
                break;
            case 'screenshot':
                await capture_service_1.captureService.capturePageScreenshot(page, urlConfig.id, 0, 100);
                break;
            case 'evaluateJs':
                if (step.code) {
                    await page.evaluate(step.code);
                }
                break;
            case 'goBack':
                await page.goBack({ waitUntil: 'networkidle2' });
                break;
            case 'goForward':
                await page.goForward({ waitUntil: 'networkidle2' });
                break;
            case 'reload':
                await page.reload({ waitUntil: 'networkidle2' });
                break;
            case 'hover':
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout });
                    await this.humanHover(page, step.selector);
                }
                break;
            case 'dragAndDrop':
                if (step.selector && step.targetSelector) {
                    await this.humanDragAndDrop(page, step.selector, step.targetSelector);
                }
                break;
        }
    }
    async humanClick(page, selector) {
        const element = await page.$(selector);
        if (element) {
            const box = await element.boundingBox();
            if (box) {
                const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
                const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;
                await this.humanMouseMove(page, x, y);
                await this.sleep(100 + Math.random() * 200);
                await page.mouse.click(x, y);
            }
        }
    }
    async humanType(page, text) {
        for (const char of text) {
            await page.keyboard.type(char);
            await this.sleep(50 + Math.random() * 100);
            if (Math.random() < 0.02) {
                await this.sleep(200 + Math.random() * 300);
            }
        }
    }
    async humanMouseMove(page, targetX, targetY) {
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        const steps = 10 + Math.floor(Math.random() * 10);
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const easeT = t * t * (3 - 2 * t);
            const x = startX + (targetX - startX) * easeT + (Math.random() - 0.5) * 5;
            const y = startY + (targetY - startY) * easeT + (Math.random() - 0.5) * 5;
            await page.mouse.move(x, y);
            await this.sleep(10 + Math.random() * 20);
        }
    }
    async humanScroll(page, xOffset, yOffset) {
        const steps = 5 + Math.floor(Math.random() * 5);
        const stepX = xOffset / steps;
        const stepY = yOffset / steps;
        for (let i = 0; i < steps; i++) {
            await page.evaluate((x, y) => window.scrollBy(x, y), stepX + (Math.random() - 0.5) * 10, stepY + (Math.random() - 0.5) * 10);
            await this.sleep(50 + Math.random() * 100);
        }
    }
    async humanScrollToBottom(page) {
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = page.viewport()?.height || 1080;
        const scrollDistance = pageHeight - viewportHeight;
        if (scrollDistance > 0) {
            await this.humanScroll(page, 0, scrollDistance);
        }
    }
    async humanHover(page, selector) {
        const element = await page.$(selector);
        if (element) {
            const box = await element.boundingBox();
            if (box) {
                const x = box.x + box.width / 2 + (Math.random() - 0.5) * 5;
                const y = box.y + box.height / 2 + (Math.random() - 0.5) * 5;
                await this.humanMouseMove(page, x, y);
                await this.sleep(200 + Math.random() * 300);
            }
        }
    }
    async humanDragAndDrop(page, sourceSelector, targetSelector) {
        const source = await page.$(sourceSelector);
        const target = await page.$(targetSelector);
        if (source && target) {
            const sourceBox = await source.boundingBox();
            const targetBox = await target.boundingBox();
            if (sourceBox && targetBox) {
                const startX = sourceBox.x + sourceBox.width / 2;
                const startY = sourceBox.y + sourceBox.height / 2;
                const endX = targetBox.x + targetBox.width / 2;
                const endY = targetBox.y + targetBox.height / 2;
                await this.humanMouseMove(page, startX, startY);
                await page.mouse.down();
                await this.sleep(100 + Math.random() * 100);
                await this.humanMouseMove(page, endX, endY);
                await this.sleep(100 + Math.random() * 100);
                await page.mouse.up();
            }
        }
    }
    async captureScreenshot(page, urlId, selector) {
        const screenshotDir = config_1.config.screenshotDir;
        if (!fs_1.default.existsSync(screenshotDir)) {
            fs_1.default.mkdirSync(screenshotDir, { recursive: true });
        }
        const fileName = `${urlId}-${Date.now()}-${(0, uuid_1.v4)().slice(0, 8)}.png`;
        const filePath = path_1.default.join(screenshotDir, fileName);
        let dimensions = { width: 1920, height: 1080 };
        if (selector) {
            const element = await page.$(selector);
            if (element) {
                await element.screenshot({ path: filePath });
                const box = await element.boundingBox();
                if (box) {
                    dimensions = { width: Math.round(box.width), height: Math.round(box.height) };
                }
            }
        }
        else {
            await page.screenshot({ path: filePath, fullPage: true });
            const pageSize = await page.evaluate(() => ({
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight,
            }));
            dimensions = pageSize;
        }
        const stats = fs_1.default.statSync(filePath);
        await prisma_1.default.screenshot.create({
            data: {
                urlId,
                filePath,
                fileName,
                width: dimensions.width,
                height: dimensions.height,
                fileSize: stats.size,
                capturedAt: new Date(),
            },
        });
        logger_1.default.info(`Screenshot captured: ${fileName}`);
        return filePath;
    }
    getRandomDelay(base, variation) {
        const variationAmount = base * (variation / 100);
        return base + (Math.random() - 0.5) * 2 * variationAmount;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async captureScreenshotOnly(urlConfig) {
        let page = null;
        try {
            await this.initialize();
            if (!this.browser)
                throw new Error('Browser not initialized');
            page = await this.browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            if (urlConfig.customUserAgent) {
                await page.setUserAgent(urlConfig.customUserAgent);
            }
            logger_1.default.info(`Navigating to ${urlConfig.url} for screenshot`);
            await page.goto(urlConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });
            const screenshotPath = await this.captureScreenshot(page, urlConfig.id);
            return screenshotPath;
        }
        finally {
            if (page) {
                await page.close();
            }
        }
    }
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            logger_1.default.info('Browser closed');
        }
    }
}
exports.AutomationService = AutomationService;
exports.automationService = new AutomationService();
//# sourceMappingURL=automation.service.js.map