import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { InteractionStep, ExecutionResult } from '../types';
import { config } from '../config';
import logger from '../utils/logger';
import prisma from '../utils/prisma';
import { resolveChromiumPath, getPuppeteerArgs } from '../utils/chromium';

export class AutomationService {
  private browser: Browser | null = null;

  async initialize() {
    if (!this.browser) {
      const executablePath = resolveChromiumPath();
      const launchOptions: any = {
        headless: true,
        args: getPuppeteerArgs(),
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
      }

      try {
        this.browser = await puppeteer.launch(launchOptions);
        logger.info('Browser initialized successfully');
      } catch (error: any) {
        logger.error(`Failed to launch browser: ${error.message}`);
        throw new Error(`Browser initialization failed. Please ensure Chromium is installed or set CHROMIUM_PATH environment variable.`);
      }
    }
    return this.browser;
  }

  async executeUrl(urlConfig: any): Promise<ExecutionResult> {
    const startTime = Date.now();
    let actionsCompleted = 0;
    let screenshotsTaken = 0;
    let page: Page | null = null;

    try {
      await this.initialize();
      if (!this.browser) throw new Error('Browser not initialized');

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

      logger.info(`Navigating to ${urlConfig.url}`);
      await page.goto(urlConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });
      actionsCompleted++;

      if (urlConfig.javascriptCode) {
        await page.evaluate(urlConfig.javascriptCode);
        actionsCompleted++;
      }

      const interactions = typeof urlConfig.interactions === 'string'
        ? JSON.parse(urlConfig.interactions)
        : urlConfig.interactions;

      for (const step of interactions) {
        await this.executeStep(page, step, urlConfig);
        actionsCompleted++;

        const delay = this.getRandomDelay(
          urlConfig.delayBetweenActions,
          urlConfig.randomBehaviorVariation
        );
        await this.sleep(delay);
      }

      if (urlConfig.screenshotInterval) {
        const screenshotPath = await this.captureScreenshot(page, urlConfig.id);
        screenshotsTaken++;
      }

      const duration = Date.now() - startTime;

      await prisma.executionLog.create({
        data: {
          userId: urlConfig.userId,
          urlId: urlConfig.id,
          status: 'success',
          duration,
          actionsCompleted,
          screenshotsTaken,
          startedAt: new Date(startTime),
          completedAt: new Date(),
        },
      });

      await prisma.url.update({
        where: { id: urlConfig.id },
        data: {
          lastRunAt: new Date(),
          successCount: { increment: 1 },
          nextScheduledAt: new Date(Date.now() + urlConfig.runIntervalSeconds * 1000),
        },
      });

      return {
        success: true,
        duration,
        actionsCompleted,
        screenshotsTaken,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`Execution failed for URL ${urlConfig.id}: ${error.message}`);

      await prisma.executionLog.create({
        data: {
          userId: urlConfig.userId,
          urlId: urlConfig.id,
          status: 'error',
          errorMessage: error.message,
          errorStack: error.stack,
          duration,
          actionsCompleted,
          screenshotsTaken,
          startedAt: new Date(startTime),
          completedAt: new Date(),
        },
      });

      await prisma.url.update({
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
        error: error.message,
        errorStack: error.stack,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private async executeStep(page: Page, step: InteractionStep, urlConfig: any) {
    const timeout = step.timeout || 30000;

    switch (step.type) {
      case 'navigate':
        if (step.value) {
          await page.goto(step.value, { waitUntil: 'networkidle2', timeout });
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
          await page.keyboard.press(step.value as any);
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
          const isChecked = await page.$eval(step.selector, (el: any) => el.checked);
          if (!isChecked) {
            await page.click(step.selector);
          }
        }
        break;

      case 'uncheck':
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout });
          const isChecked = await page.$eval(step.selector, (el: any) => el.checked);
          if (isChecked) {
            await page.click(step.selector);
          }
        }
        break;

      case 'scroll':
        await page.evaluate((x, y) => window.scrollBy(x, y), step.xOffset || 0, step.yOffset || 0);
        break;

      case 'scrollToElement':
        if (step.selector) {
          await page.waitForSelector(step.selector, { timeout });
          await page.$eval(step.selector, (el) => el.scrollIntoView({ behavior: 'smooth' }));
        }
        break;

      case 'scrollToBottom':
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        break;

      case 'scrollToTop':
        await page.evaluate(() => window.scrollTo(0, 0));
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
        await this.captureScreenshot(page, urlConfig.id, step.selector);
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
    }
  }

  private async humanClick(page: Page, selector: string) {
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;
        await page.mouse.move(x, y, { steps: 10 + Math.floor(Math.random() * 10) });
        await this.sleep(100 + Math.random() * 200);
        await page.mouse.click(x, y);
      }
    }
  }

  private async humanType(page: Page, text: string) {
    for (const char of text) {
      await page.keyboard.type(char);
      await this.sleep(50 + Math.random() * 100);
    }
  }

  async captureScreenshot(page: Page, urlId: string, selector?: string): Promise<string> {
    const screenshotDir = config.screenshotDir;
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const fileName = `${urlId}-${Date.now()}-${uuidv4().slice(0, 8)}.png`;
    const filePath = path.join(screenshotDir, fileName);

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
    } else {
      await page.screenshot({ path: filePath, fullPage: true });
      const pageSize = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));
      dimensions = pageSize;
    }

    const stats = fs.statSync(filePath);

    await prisma.screenshot.create({
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

    logger.info(`Screenshot captured: ${fileName}`);
    return filePath;
  }

  private getRandomDelay(base: number, variation: number): number {
    const variationAmount = base * (variation / 100);
    return base + (Math.random() - 0.5) * 2 * variationAmount;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async captureScreenshotOnly(urlConfig: any): Promise<string> {
    let page = null;
    try {
      await this.initialize();
      if (!this.browser) throw new Error('Browser not initialized');

      page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      if (urlConfig.customUserAgent) {
        await page.setUserAgent(urlConfig.customUserAgent);
      }

      logger.info(`Navigating to ${urlConfig.url} for screenshot`);
      await page.goto(urlConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });

      const screenshotPath = await this.captureScreenshot(page, urlConfig.id);
      return screenshotPath;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Browser closed');
    }
  }
}

export const automationService = new AutomationService();
