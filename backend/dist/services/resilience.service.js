"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resilienceService = exports.ResilienceService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
};
class ResilienceService {
    circuitBreaker = new Map();
    circuitThreshold = 5;
    circuitResetTime = 60000;
    async withRetry(operation, operationName, config = {}) {
        const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
        let lastError = null;
        let delay = retryConfig.initialDelay;
        for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt <= retryConfig.maxRetries) {
                    logger_1.default.warn(`[Resilience] ${operationName} failed (attempt ${attempt}/${retryConfig.maxRetries + 1}): ${lastError.message}`);
                    await this.sleep(delay);
                    delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
                }
            }
        }
        throw lastError;
    }
    async findWithFallbacks(page, selectorConfig, timeout = 5000) {
        const allSelectors = [selectorConfig.primary, ...selectorConfig.fallbacks];
        for (const selector of allSelectors) {
            try {
                const element = await page.waitForSelector(selector, { timeout });
                if (element) {
                    logger_1.default.debug(`[Resilience] Found element with selector: ${selector}`);
                    return selector;
                }
            }
            catch (error) {
            }
        }
        logger_1.default.warn(`[Resilience] No selector found from fallbacks`);
        return null;
    }
    async smartClick(page, selectorConfig, timeout = 5000) {
        const foundSelector = await this.findWithFallbacks(page, selectorConfig, timeout);
        if (!foundSelector) {
            return false;
        }
        try {
            await page.click(foundSelector);
            return true;
        }
        catch (error) {
            try {
                await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (el)
                        el.click();
                }, foundSelector);
                return true;
            }
            catch (evalError) {
                logger_1.default.error(`[Resilience] Click failed for ${foundSelector}`);
                return false;
            }
        }
    }
    isCircuitOpen(key) {
        const circuit = this.circuitBreaker.get(key);
        if (!circuit)
            return false;
        if (circuit.open) {
            const timeSinceFailure = Date.now() - circuit.lastFailure.getTime();
            if (timeSinceFailure > this.circuitResetTime) {
                circuit.open = false;
                circuit.failures = 0;
                logger_1.default.info(`[Resilience] Circuit breaker reset for ${key}`);
                return false;
            }
            return true;
        }
        return false;
    }
    recordFailure(key) {
        const circuit = this.circuitBreaker.get(key) || { failures: 0, lastFailure: new Date(), open: false };
        circuit.failures++;
        circuit.lastFailure = new Date();
        if (circuit.failures >= this.circuitThreshold) {
            circuit.open = true;
            logger_1.default.warn(`[Resilience] Circuit breaker opened for ${key}`);
        }
        this.circuitBreaker.set(key, circuit);
    }
    recordSuccess(key) {
        const circuit = this.circuitBreaker.get(key);
        if (circuit) {
            circuit.failures = Math.max(0, circuit.failures - 1);
            circuit.open = false;
        }
    }
    async waitForPageStable(page, timeout = 5000) {
        const startTime = Date.now();
        let lastHeight = 0;
        let stableCount = 0;
        while (Date.now() - startTime < timeout) {
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            if (currentHeight === lastHeight) {
                stableCount++;
                if (stableCount >= 3) {
                    return;
                }
            }
            else {
                stableCount = 0;
            }
            lastHeight = currentHeight;
            await this.sleep(200);
        }
    }
    async safeNavigate(page, url, options = {}) {
        const { timeout = 30000, waitUntil = 'networkidle2' } = options;
        return this.withRetry(async () => {
            await page.goto(url, { waitUntil, timeout });
            return true;
        }, `Navigate to ${url}`, { maxRetries: 2 }).catch(() => false);
    }
    async handlePopups(page) {
        const popupSelectors = [
            '[class*="modal"] button[class*="close"]',
            '[class*="popup"] button[class*="close"]',
            '[class*="overlay"] button[class*="close"]',
            '[aria-label="Close"]',
            '.cookie-banner button',
            '#cookie-consent button',
            '[class*="cookie"] button[class*="accept"]',
            '[class*="cookie"] button[class*="dismiss"]',
        ];
        for (const selector of popupSelectors) {
            try {
                const element = await page.$(selector);
                if (element) {
                    const isVisible = await page.evaluate((el) => {
                        const style = window.getComputedStyle(el);
                        return style.display !== 'none' && style.visibility !== 'hidden';
                    }, element);
                    if (isVisible) {
                        await element.click();
                        logger_1.default.debug(`[Resilience] Closed popup with selector: ${selector}`);
                        await this.sleep(500);
                    }
                }
            }
            catch (error) {
            }
        }
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.ResilienceService = ResilienceService;
exports.resilienceService = new ResilienceService();
//# sourceMappingURL=resilience.service.js.map