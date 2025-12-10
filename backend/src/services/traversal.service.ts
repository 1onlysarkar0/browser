import { Page } from 'puppeteer';
import prisma from '../utils/prisma';
import logger from '../utils/logger';
import crypto from 'crypto';

export interface TraversalConfig {
  urlId: string;
  maxDepth: number;
  maxPages: number;
  followExternalLinks: boolean;
  paginationSelector?: string;
  baseUrl: string;
}

export interface PageInfo {
  url: string;
  title: string;
  depth: number;
  links: string[];
  contentHash: string;
  htmlLength: number;
}

export class TraversalService {
  private visitedUrls: Set<string> = new Set();
  private pageQueue: Array<{ url: string; depth: number }> = [];

  async initializeQueue(config: TraversalConfig): Promise<void> {
    this.visitedUrls.clear();
    this.pageQueue = [];

    await prisma.traversalQueue.deleteMany({
      where: { urlId: config.urlId },
    });

    await prisma.traversalQueue.create({
      data: {
        urlId: config.urlId,
        pageUrl: config.baseUrl,
        depth: 0,
        priority: 100,
        status: 'pending',
      },
    });

    logger.info(`[Traversal] Queue initialized for URL ${config.urlId}`);
  }

  async getNextPage(urlId: string): Promise<{ pageUrl: string; depth: number } | null> {
    const next = await prisma.traversalQueue.findFirst({
      where: {
        urlId,
        status: 'pending',
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    if (next) {
      await prisma.traversalQueue.update({
        where: { id: next.id },
        data: { status: 'processing' },
      });
      return { pageUrl: next.pageUrl, depth: next.depth };
    }

    return null;
  }

  async markPageComplete(urlId: string, pageUrl: string): Promise<void> {
    await prisma.traversalQueue.updateMany({
      where: { urlId, pageUrl },
      data: { status: 'completed', processedAt: new Date() },
    });
  }

  async markPageFailed(urlId: string, pageUrl: string): Promise<void> {
    const existing = await prisma.traversalQueue.findFirst({
      where: { urlId, pageUrl },
    });

    if (existing && existing.retryCount < 3) {
      await prisma.traversalQueue.update({
        where: { id: existing.id },
        data: { 
          status: 'pending', 
          retryCount: existing.retryCount + 1,
          priority: existing.priority - 10,
        },
      });
    } else if (existing) {
      await prisma.traversalQueue.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
    }
  }

  async addToQueue(urlId: string, pageUrl: string, depth: number, priority: number = 50): Promise<boolean> {
    try {
      await prisma.traversalQueue.upsert({
        where: { urlId_pageUrl: { urlId, pageUrl } },
        create: {
          urlId,
          pageUrl,
          depth,
          priority,
          status: 'pending',
        },
        update: {},
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async extractPageInfo(page: Page, depth: number): Promise<PageInfo> {
    const url = page.url();
    const title = await page.title();
    
    const pageData = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith('http'));
      
      const html = document.documentElement.outerHTML;
      return {
        links: [...new Set(links)],
        htmlLength: html.length,
        html,
      };
    });

    const contentHash = crypto
      .createHash('md5')
      .update(pageData.html.substring(0, 50000))
      .digest('hex');

    return {
      url,
      title,
      depth,
      links: pageData.links,
      contentHash,
      htmlLength: pageData.htmlLength,
    };
  }

  async discoverLinks(
    page: Page,
    config: TraversalConfig,
    currentDepth: number
  ): Promise<string[]> {
    if (currentDepth >= config.maxDepth) {
      return [];
    }

    const pageInfo = await this.extractPageInfo(page, currentDepth);
    const discoveredLinks: string[] = [];
    const baseHost = new URL(config.baseUrl).hostname;

    for (const link of pageInfo.links) {
      try {
        const linkUrl = new URL(link);
        const isSameDomain = linkUrl.hostname === baseHost;

        if (!config.followExternalLinks && !isSameDomain) {
          continue;
        }

        const cleanUrl = `${linkUrl.origin}${linkUrl.pathname}`;
        
        if (!this.visitedUrls.has(cleanUrl)) {
          this.visitedUrls.add(cleanUrl);
          discoveredLinks.push(cleanUrl);
          
          await this.addToQueue(
            config.urlId,
            cleanUrl,
            currentDepth + 1,
            50 - currentDepth * 10
          );
        }
      } catch (error) {
      }
    }

    logger.info(`[Traversal] Discovered ${discoveredLinks.length} new links at depth ${currentDepth}`);
    return discoveredLinks;
  }

  async handlePagination(page: Page, paginationSelector: string): Promise<boolean> {
    try {
      const nextButton = await page.$(paginationSelector);
      if (nextButton) {
        const isDisabled = await page.evaluate(
          (el) => el.hasAttribute('disabled') || el.classList.contains('disabled'),
          nextButton
        );
        
        if (!isDisabled) {
          await nextButton.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
          return true;
        }
      }
    } catch (error) {
      logger.debug(`[Traversal] Pagination failed: ${(error as Error).message}`);
    }
    return false;
  }

  async recordPageVisit(urlId: string, pageInfo: PageInfo): Promise<void> {
    await prisma.pageVisit.create({
      data: {
        urlId,
        pageUrl: pageInfo.url,
        pageTitle: pageInfo.title,
        depth: pageInfo.depth,
        status: 'completed',
        visitedAt: new Date(),
      },
    });
  }

  async getQueueStatus(urlId: string): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const [pending, processing, completed, failed] = await Promise.all([
      prisma.traversalQueue.count({ where: { urlId, status: 'pending' } }),
      prisma.traversalQueue.count({ where: { urlId, status: 'processing' } }),
      prisma.traversalQueue.count({ where: { urlId, status: 'completed' } }),
      prisma.traversalQueue.count({ where: { urlId, status: 'failed' } }),
    ]);

    return { pending, processing, completed, failed };
  }
}

export const traversalService = new TraversalService();
