import { Page } from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { config } from '../config';

export interface CaptureConfig {
  urlId: string;
  maxScreenshots: number;
  captureFullPage: boolean;
  captureViewport: boolean;
  captureElements?: string[];
}

export interface CaptureResult {
  screenshotId: string;
  fileName: string;
  filePath: string;
  pageUrl: string;
  pageTitle: string;
  width: number;
  height: number;
}

export class CaptureService {
  private screenshotCount: Map<string, number> = new Map();

  async capturePageScreenshot(
    page: Page,
    urlId: string,
    pageIndex: number,
    maxScreenshots: number
  ): Promise<CaptureResult | null> {
    const currentCount = this.screenshotCount.get(urlId) || 0;
    
    if (currentCount >= maxScreenshots) {
      logger.debug(`[Capture] Max screenshots (${maxScreenshots}) reached for URL ${urlId}`);
      return null;
    }

    const screenshotDir = config.screenshotDir;
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const pageUrl = page.url();
    const pageTitle = await page.title();
    const fileName = `${urlId}-page${pageIndex + 1}-${Date.now()}-${uuidv4().slice(0, 8)}.png`;
    const filePath = path.join(screenshotDir, fileName);

    try {
      await page.screenshot({ path: filePath, fullPage: true });

      const stats = fs.statSync(filePath);
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));

      const screenshot = await prisma.screenshot.create({
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
      logger.info(`[Capture] Screenshot ${currentCount + 1}/${maxScreenshots} captured: ${fileName}`);

      return {
        screenshotId: screenshot.id,
        fileName,
        filePath,
        pageUrl,
        pageTitle,
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      logger.error(`[Capture] Failed to capture screenshot: ${(error as Error).message}`);
      return null;
    }
  }

  async captureViewportScreenshot(page: Page, urlId: string): Promise<CaptureResult | null> {
    const screenshotDir = config.screenshotDir;
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const pageUrl = page.url();
    const pageTitle = await page.title();
    const fileName = `${urlId}-viewport-${Date.now()}-${uuidv4().slice(0, 8)}.png`;
    const filePath = path.join(screenshotDir, fileName);

    try {
      await page.screenshot({ path: filePath, fullPage: false });

      const stats = fs.statSync(filePath);
      const viewport = page.viewport();

      const screenshot = await prisma.screenshot.create({
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

      logger.info(`[Capture] Viewport screenshot captured: ${fileName}`);

      return {
        screenshotId: screenshot.id,
        fileName,
        filePath,
        pageUrl,
        pageTitle,
        width: viewport?.width || 1920,
        height: viewport?.height || 1080,
      };
    } catch (error) {
      logger.error(`[Capture] Failed to capture viewport screenshot: ${(error as Error).message}`);
      return null;
    }
  }

  async captureElementScreenshot(
    page: Page,
    urlId: string,
    selector: string
  ): Promise<CaptureResult | null> {
    const element = await page.$(selector);
    if (!element) {
      logger.warn(`[Capture] Element not found: ${selector}`);
      return null;
    }

    const screenshotDir = config.screenshotDir;
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const pageUrl = page.url();
    const pageTitle = await page.title();
    const fileName = `${urlId}-element-${Date.now()}-${uuidv4().slice(0, 8)}.png`;
    const filePath = path.join(screenshotDir, fileName);

    try {
      await element.screenshot({ path: filePath });

      const stats = fs.statSync(filePath);
      const box = await element.boundingBox();

      const screenshot = await prisma.screenshot.create({
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

      logger.info(`[Capture] Element screenshot captured: ${fileName}`);

      return {
        screenshotId: screenshot.id,
        fileName,
        filePath,
        pageUrl,
        pageTitle,
        width: Math.round(box?.width || 0),
        height: Math.round(box?.height || 0),
      };
    } catch (error) {
      logger.error(`[Capture] Failed to capture element screenshot: ${(error as Error).message}`);
      return null;
    }
  }

  async captureMultipleSections(
    page: Page,
    urlId: string,
    scrollSteps: number = 3
  ): Promise<CaptureResult[]> {
    const results: CaptureResult[] = [];
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
    logger.info(`[Capture] Captured ${results.length} sections for URL ${urlId}`);
    return results;
  }

  resetCounter(urlId: string): void {
    this.screenshotCount.set(urlId, 0);
  }

  getCount(urlId: string): number {
    return this.screenshotCount.get(urlId) || 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const captureService = new CaptureService();
