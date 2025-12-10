"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureService = exports.CaptureService = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
const config_1 = require("../config");
class CaptureService {
    screenshotCount = new Map();
    async capturePageScreenshot(page, urlId, pageIndex, maxScreenshots) {
        const currentCount = this.screenshotCount.get(urlId) || 0;
        if (currentCount >= maxScreenshots) {
            logger_1.default.debug(`[Capture] Max screenshots (${maxScreenshots}) reached for URL ${urlId}`);
            return null;
        }
        const screenshotDir = config_1.config.screenshotDir;
        if (!fs_1.default.existsSync(screenshotDir)) {
            fs_1.default.mkdirSync(screenshotDir, { recursive: true });
        }
        const pageUrl = page.url();
        const pageTitle = await page.title();
        const fileName = `${urlId}-page${pageIndex + 1}-${Date.now()}-${(0, uuid_1.v4)().slice(0, 8)}.png`;
        const filePath = path_1.default.join(screenshotDir, fileName);
        try {
            await page.screenshot({ path: filePath, fullPage: true });
            const stats = fs_1.default.statSync(filePath);
            const dimensions = await page.evaluate(() => ({
                width: document.documentElement.scrollWidth,
                height: document.documentElement.scrollHeight,
            }));
            const screenshot = await prisma_1.default.screenshot.create({
                data: {
                    urlId,
                    filePath,
                    fileName,
                    width: dimensions.width,
                    height: dimensions.height,
                    fileSize: stats.size,
                    pageUrl,
                    pageTitle,
                    capturedAt: new Date(),
                },
            });
            this.screenshotCount.set(urlId, currentCount + 1);
            logger_1.default.info(`[Capture] Screenshot ${currentCount + 1}/${maxScreenshots} captured: ${fileName}`);
            return {
                screenshotId: screenshot.id,
                fileName,
                filePath,
                pageUrl,
                pageTitle,
                width: dimensions.width,
                height: dimensions.height,
            };
        }
        catch (error) {
            logger_1.default.error(`[Capture] Failed to capture screenshot: ${error.message}`);
            return null;
        }
    }
    async captureViewportScreenshot(page, urlId) {
        const screenshotDir = config_1.config.screenshotDir;
        if (!fs_1.default.existsSync(screenshotDir)) {
            fs_1.default.mkdirSync(screenshotDir, { recursive: true });
        }
        const pageUrl = page.url();
        const pageTitle = await page.title();
        const fileName = `${urlId}-viewport-${Date.now()}-${(0, uuid_1.v4)().slice(0, 8)}.png`;
        const filePath = path_1.default.join(screenshotDir, fileName);
        try {
            await page.screenshot({ path: filePath, fullPage: false });
            const stats = fs_1.default.statSync(filePath);
            const viewport = page.viewport();
            const screenshot = await prisma_1.default.screenshot.create({
                data: {
                    urlId,
                    filePath,
                    fileName,
                    width: viewport?.width || 1920,
                    height: viewport?.height || 1080,
                    fileSize: stats.size,
                    pageUrl,
                    pageTitle,
                    capturedAt: new Date(),
                },
            });
            logger_1.default.info(`[Capture] Viewport screenshot captured: ${fileName}`);
            return {
                screenshotId: screenshot.id,
                fileName,
                filePath,
                pageUrl,
                pageTitle,
                width: viewport?.width || 1920,
                height: viewport?.height || 1080,
            };
        }
        catch (error) {
            logger_1.default.error(`[Capture] Failed to capture viewport screenshot: ${error.message}`);
            return null;
        }
    }
    async captureElementScreenshot(page, urlId, selector) {
        const element = await page.$(selector);
        if (!element) {
            logger_1.default.warn(`[Capture] Element not found: ${selector}`);
            return null;
        }
        const screenshotDir = config_1.config.screenshotDir;
        if (!fs_1.default.existsSync(screenshotDir)) {
            fs_1.default.mkdirSync(screenshotDir, { recursive: true });
        }
        const pageUrl = page.url();
        const pageTitle = await page.title();
        const fileName = `${urlId}-element-${Date.now()}-${(0, uuid_1.v4)().slice(0, 8)}.png`;
        const filePath = path_1.default.join(screenshotDir, fileName);
        try {
            await element.screenshot({ path: filePath });
            const stats = fs_1.default.statSync(filePath);
            const box = await element.boundingBox();
            const screenshot = await prisma_1.default.screenshot.create({
                data: {
                    urlId,
                    filePath,
                    fileName,
                    width: Math.round(box?.width || 0),
                    height: Math.round(box?.height || 0),
                    fileSize: stats.size,
                    pageUrl,
                    pageTitle,
                    capturedAt: new Date(),
                },
            });
            logger_1.default.info(`[Capture] Element screenshot captured: ${fileName}`);
            return {
                screenshotId: screenshot.id,
                fileName,
                filePath,
                pageUrl,
                pageTitle,
                width: Math.round(box?.width || 0),
                height: Math.round(box?.height || 0),
            };
        }
        catch (error) {
            logger_1.default.error(`[Capture] Failed to capture element screenshot: ${error.message}`);
            return null;
        }
    }
    async captureMultipleSections(page, urlId, scrollSteps = 3) {
        const results = [];
        const viewport = page.viewport();
        const viewportHeight = viewport?.height || 1080;
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
        const actualSteps = Math.min(scrollSteps, Math.ceil(pageHeight / viewportHeight));
        for (let i = 0; i < actualSteps; i++) {
            const scrollY = i * viewportHeight;
            await page.evaluate((y) => window.scrollTo(0, y), scrollY);
            await this.sleep(500);
            const result = await this.captureViewportScreenshot(page, urlId);
            if (result) {
                results.push(result);
            }
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        logger_1.default.info(`[Capture] Captured ${results.length} sections for URL ${urlId}`);
        return results;
    }
    resetCounter(urlId) {
        this.screenshotCount.set(urlId, 0);
    }
    getCount(urlId) {
        return this.screenshotCount.get(urlId) || 0;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.CaptureService = CaptureService;
exports.captureService = new CaptureService();
//# sourceMappingURL=capture.service.js.map