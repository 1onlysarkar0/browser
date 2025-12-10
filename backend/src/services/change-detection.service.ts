import { Page } from 'puppeteer';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export interface ChangeResult {
  hasChanged: boolean;
  changePercent: number;
  previousHash?: string;
  currentHash: string;
}

export class ChangeDetectionService {
  async detectChanges(
    page: Page,
    urlId: string,
    threshold: number = 10
  ): Promise<ChangeResult> {
    const pageUrl = page.url();

    const { html, htmlLength } = await page.evaluate(() => ({
      html: document.documentElement.outerHTML,
      htmlLength: document.documentElement.outerHTML.length,
    }));

    const cleanedHtml = this.cleanHtmlForComparison(html);
    const currentHash = crypto.createHash('md5').update(cleanedHtml).digest('hex');

    const previousSnapshot = await prisma.pageSnapshot.findFirst({
      where: { urlId, pageUrl },
      orderBy: { capturedAt: 'desc' },
    });

    let hasChanged = false;
    let changePercent = 0;

    if (previousSnapshot) {
      if (previousSnapshot.contentHash !== currentHash) {
        changePercent = this.calculateChangePercent(
          previousSnapshot.htmlLength,
          htmlLength
        );
        hasChanged = changePercent >= threshold;

        if (hasChanged) {
          logger.info(
            `[ChangeDetection] Change detected on ${pageUrl}: ${changePercent.toFixed(1)}% change`
          );
        }
      }
    } else {
      hasChanged = true;
      changePercent = 100;
    }

    await prisma.pageSnapshot.create({
      data: {
        urlId,
        pageUrl,
        contentHash: currentHash,
        htmlLength,
        changePercent,
      },
    });

    return {
      hasChanged,
      changePercent,
      previousHash: previousSnapshot?.contentHash,
      currentHash,
    };
  }

  private cleanHtmlForComparison(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s+/g, ' ')
      .replace(/data-[\w-]+="[^"]*"/g, '')
      .replace(/id="[^"]*"/g, '')
      .replace(/class="[^"]*"/g, 'class=""')
      .trim();
  }

  private calculateChangePercent(oldLength: number, newLength: number): number {
    if (oldLength === 0) return 100;
    const diff = Math.abs(newLength - oldLength);
    return (diff / oldLength) * 100;
  }

  async getChangeHistory(urlId: string, pageUrl?: string): Promise<any[]> {
    return prisma.pageSnapshot.findMany({
      where: pageUrl ? { urlId, pageUrl } : { urlId },
      orderBy: { capturedAt: 'desc' },
      take: 100,
    });
  }

  async clearSnapshots(urlId: string): Promise<void> {
    await prisma.pageSnapshot.deleteMany({
      where: { urlId },
    });
  }

  async getLatestSnapshot(urlId: string, pageUrl: string): Promise<any | null> {
    return prisma.pageSnapshot.findFirst({
      where: { urlId, pageUrl },
      orderBy: { capturedAt: 'desc' },
    });
  }
}

export const changeDetectionService = new ChangeDetectionService();
