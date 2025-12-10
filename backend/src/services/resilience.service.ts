import { Page } from 'puppeteer';
import logger from '../utils/logger';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface SelectorFallback {
  primary: string;
  fallbacks: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export class ResilienceService {
  private circuitBreaker: Map<string, { failures: number; lastFailure: Date; open: boolean }> = new Map();
  private readonly circuitThreshold = 5;
  private readonly circuitResetTime = 60000;

  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error | null = null;
    let delay = retryConfig.initialDelay;

    for (let attempt = 1; attempt <= retryConfig.maxRetries + 1; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt <= retryConfig.maxRetries) {
          logger.warn(
            `[Resilience] ${operationName} failed (attempt ${attempt}/${retryConfig.maxRetries + 1}): ${lastError.message}`
          );
          await this.sleep(delay);
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelay);
        }
      }
    }

    throw lastError;
  }

  async findWithFallbacks(
    page: Page,
    selectorConfig: SelectorFallback,
    timeout: number = 5000
  ): Promise<string | null> {
    const allSelectors = [selectorConfig.primary, ...selectorConfig.fallbacks];

    for (const selector of allSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout });
        if (element) {
          logger.debug(`[Resilience] Found element with selector: ${selector}`);
          return selector;
        }
      } catch (error) {
      }
    }

    logger.warn(`[Resilience] No selector found from fallbacks`);
    return null;
  }

  async smartClick(
    page: Page,
    selectorConfig: SelectorFallback,
    timeout: number = 5000
  ): Promise<boolean> {
    const foundSelector = await this.findWithFallbacks(page, selectorConfig, timeout);
    
    if (!foundSelector) {
      return false;
    }

    try {
      await page.click(foundSelector);
      return true;
    } catch (error) {
      try {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) (el as HTMLElement).click();
        }, foundSelector);
        return true;
      } catch (evalError) {
        logger.error(`[Resilience] Click failed for ${foundSelector}`);
        return false;
      }
    }
  }

  isCircuitOpen(key: string): boolean {
    const circuit = this.circuitBreaker.get(key);
    if (!circuit) return false;

    if (circuit.open) {
      const timeSinceFailure = Date.now() - circuit.lastFailure.getTime();
      if (timeSinceFailure > this.circuitResetTime) {
        circuit.open = false;
        circuit.failures = 0;
        logger.info(`[Resilience] Circuit breaker reset for ${key}`);
        return false;
      }
      return true;
    }

    return false;
  }

  recordFailure(key: string): void {
    const circuit = this.circuitBreaker.get(key) || { failures: 0, lastFailure: new Date(), open: false };
    circuit.failures++;
    circuit.lastFailure = new Date();

    if (circuit.failures >= this.circuitThreshold) {
      circuit.open = true;
      logger.warn(`[Resilience] Circuit breaker opened for ${key}`);
    }

    this.circuitBreaker.set(key, circuit);
  }

  recordSuccess(key: string): void {
    const circuit = this.circuitBreaker.get(key);
    if (circuit) {
      circuit.failures = Math.max(0, circuit.failures - 1);
      circuit.open = false;
    }
  }

  async waitForPageStable(page: Page, timeout: number = 5000): Promise<void> {
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
      } else {
        stableCount = 0;
      }

      lastHeight = currentHeight;
      await this.sleep(200);
    }
  }

  async safeNavigate(
    page: Page,
    url: string,
    options: { timeout?: number; waitUntil?: 'load' | 'networkidle0' | 'networkidle2' | 'domcontentloaded' } = {}
  ): Promise<boolean> {
    const { timeout = 30000, waitUntil = 'networkidle2' } = options;

    return this.withRetry(
      async () => {
        await page.goto(url, { waitUntil, timeout });
        return true;
      },
      `Navigate to ${url}`,
      { maxRetries: 2 }
    ).catch(() => false);
  }

  async handlePopups(page: Page): Promise<void> {
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
            logger.debug(`[Resilience] Closed popup with selector: ${selector}`);
            await this.sleep(500);
          }
        }
      } catch (error) {
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const resilienceService = new ResilienceService();
