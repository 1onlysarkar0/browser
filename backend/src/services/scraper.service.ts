import { Page } from 'puppeteer';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export interface ScrapeSelector {
  name: string;
  selector: string;
  attribute?: string;
  multiple?: boolean;
  type?: 'text' | 'html' | 'attribute' | 'link';
}

export interface ScrapeResult {
  pageUrl: string;
  data: Record<string, any>;
  itemCount: number;
}

export class ScraperService {
  async scrapeWithSelectors(
    page: Page,
    urlId: string,
    selectors: ScrapeSelector[]
  ): Promise<ScrapeResult> {
    const pageUrl = page.url();
    const data: Record<string, any> = {};
    let itemCount = 0;

    for (const selector of selectors) {
      try {
        const result = await this.extractData(page, selector);
        data[selector.name] = result;
        itemCount += Array.isArray(result) ? result.length : 1;

        if (Array.isArray(result)) {
          for (const value of result) {
            await this.saveScrapedData(urlId, pageUrl, selector, String(value));
          }
        } else if (result) {
          await this.saveScrapedData(urlId, pageUrl, selector, String(result));
        }
      } catch (error) {
        logger.warn(`[Scraper] Failed to extract ${selector.name}: ${(error as Error).message}`);
        data[selector.name] = null;
      }
    }

    logger.info(`[Scraper] Scraped ${itemCount} items from ${pageUrl}`);
    return { pageUrl, data, itemCount };
  }

  private async extractData(page: Page, selector: ScrapeSelector): Promise<any> {
    const type = selector.type || 'text';

    if (selector.multiple) {
      return page.$$eval(
        selector.selector,
        (elements, attr, dataType) => {
          return elements.map((el) => {
            if (dataType === 'html') return el.innerHTML;
            if (dataType === 'link') return (el as HTMLAnchorElement).href;
            if (dataType === 'attribute' && attr) return el.getAttribute(attr);
            return el.textContent?.trim() || '';
          });
        },
        selector.attribute,
        type
      );
    } else {
      return page.$eval(
        selector.selector,
        (el, attr, dataType) => {
          if (dataType === 'html') return el.innerHTML;
          if (dataType === 'link') return (el as HTMLAnchorElement).href;
          if (dataType === 'attribute' && attr) return el.getAttribute(attr);
          return el.textContent?.trim() || '';
        },
        selector.attribute,
        type
      ).catch(() => null);
    }
  }

  private async saveScrapedData(
    urlId: string,
    pageUrl: string,
    selector: ScrapeSelector,
    value: string
  ): Promise<void> {
    await prisma.scrapedData.create({
      data: {
        urlId,
        pageUrl,
        selector: selector.selector,
        dataType: selector.type || 'text',
        dataKey: selector.name,
        dataValue: value.substring(0, 10000),
      },
    });
  }

  async autoScrape(page: Page, urlId: string): Promise<ScrapeResult> {
    const pageUrl = page.url();
    const data: Record<string, any> = {};

    const autoData = await page.evaluate(() => {
      const result: Record<string, any> = {};
      
      const title = document.title;
      if (title) result.pageTitle = title;

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) result.metaDescription = metaDesc.getAttribute('content');

      const h1 = document.querySelector('h1');
      if (h1) result.mainHeading = h1.textContent?.trim();

      const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .slice(0, 10)
        .map((h) => ({ tag: h.tagName, text: h.textContent?.trim() }));
      result.headings = headings;

      const images = Array.from(document.querySelectorAll('img[src]'))
        .slice(0, 20)
        .map((img) => ({
          src: (img as HTMLImageElement).src,
          alt: img.getAttribute('alt'),
        }));
      result.images = images;

      const links = Array.from(document.querySelectorAll('a[href]'))
        .slice(0, 50)
        .map((a) => ({
          href: (a as HTMLAnchorElement).href,
          text: a.textContent?.trim()?.substring(0, 100),
        }));
      result.links = links;

      const paragraphs = Array.from(document.querySelectorAll('p'))
        .slice(0, 10)
        .map((p) => p.textContent?.trim()?.substring(0, 500))
        .filter((p) => p && p.length > 20);
      result.paragraphs = paragraphs;

      return result;
    });

    Object.assign(data, autoData);

    for (const [key, value] of Object.entries(autoData)) {
      if (value && typeof value === 'string') {
        await prisma.scrapedData.create({
          data: {
            urlId,
            pageUrl,
            selector: 'auto',
            dataType: 'text',
            dataKey: key,
            dataValue: String(value).substring(0, 10000),
          },
        });
      }
    }

    const itemCount = Object.keys(data).length;
    logger.info(`[Scraper] Auto-scraped ${itemCount} data points from ${pageUrl}`);

    return { pageUrl, data, itemCount };
  }

  async getScrapedDataForUrl(urlId: string): Promise<any[]> {
    return prisma.scrapedData.findMany({
      where: { urlId },
      orderBy: { scrapedAt: 'desc' },
      take: 1000,
    });
  }

  async clearScrapedData(urlId: string): Promise<void> {
    await prisma.scrapedData.deleteMany({
      where: { urlId },
    });
  }
}

export const scraperService = new ScraperService();
