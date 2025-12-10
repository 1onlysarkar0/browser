"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.traversalService = exports.TraversalService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
class TraversalService {
    visitedUrls = new Set();
    pageQueue = [];
    async initializeQueue(config) {
        this.visitedUrls.clear();
        this.pageQueue = [];
        await prisma_1.default.traversalQueue.deleteMany({
            where: { urlId: config.urlId },
        });
        await prisma_1.default.traversalQueue.create({
            data: {
                urlId: config.urlId,
                pageUrl: config.baseUrl,
                depth: 0,
                priority: 100,
                status: 'pending',
            },
        });
        logger_1.default.info(`[Traversal] Queue initialized for URL ${config.urlId}`);
    }
    async getNextPage(urlId) {
        const next = await prisma_1.default.traversalQueue.findFirst({
            where: {
                urlId,
                status: 'pending',
            },
            orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        });
        if (next) {
            await prisma_1.default.traversalQueue.update({
                where: { id: next.id },
                data: { status: 'processing' },
            });
            return { pageUrl: next.pageUrl, depth: next.depth };
        }
        return null;
    }
    async markPageComplete(urlId, pageUrl) {
        await prisma_1.default.traversalQueue.updateMany({
            where: { urlId, pageUrl },
            data: { status: 'completed', processedAt: new Date() },
        });
    }
    async markPageFailed(urlId, pageUrl) {
        const existing = await prisma_1.default.traversalQueue.findFirst({
            where: { urlId, pageUrl },
        });
        if (existing && existing.retryCount < 3) {
            await prisma_1.default.traversalQueue.update({
                where: { id: existing.id },
                data: {
                    status: 'pending',
                    retryCount: existing.retryCount + 1,
                    priority: existing.priority - 10,
                },
            });
        }
        else if (existing) {
            await prisma_1.default.traversalQueue.update({
                where: { id: existing.id },
                data: { status: 'failed' },
            });
        }
    }
    async addToQueue(urlId, pageUrl, depth, priority = 50) {
        try {
            await prisma_1.default.traversalQueue.upsert({
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
        }
        catch (error) {
            return false;
        }
    }
    async extractPageInfo(page, depth) {
        const url = page.url();
        const title = await page.title();
        const pageData = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'))
                .map((a) => a.href)
                .filter((href) => href.startsWith('http'));
            const html = document.documentElement.outerHTML;
            return {
                links: [...new Set(links)],
                htmlLength: html.length,
                html,
            };
        });
        const contentHash = crypto_1.default
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
    async discoverLinks(page, config, currentDepth) {
        if (currentDepth >= config.maxDepth) {
            return [];
        }
        const pageInfo = await this.extractPageInfo(page, currentDepth);
        const discoveredLinks = [];
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
                    await this.addToQueue(config.urlId, cleanUrl, currentDepth + 1, 50 - currentDepth * 10);
                }
            }
            catch (error) {
            }
        }
        logger_1.default.info(`[Traversal] Discovered ${discoveredLinks.length} new links at depth ${currentDepth}`);
        return discoveredLinks;
    }
    async handlePagination(page, paginationSelector) {
        try {
            const nextButton = await page.$(paginationSelector);
            if (nextButton) {
                const isDisabled = await page.evaluate((el) => el.hasAttribute('disabled') || el.classList.contains('disabled'), nextButton);
                if (!isDisabled) {
                    await nextButton.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                    return true;
                }
            }
        }
        catch (error) {
            logger_1.default.debug(`[Traversal] Pagination failed: ${error.message}`);
        }
        return false;
    }
    async recordPageVisit(urlId, pageInfo) {
        await prisma_1.default.pageVisit.create({
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
    async getQueueStatus(urlId) {
        const [pending, processing, completed, failed] = await Promise.all([
            prisma_1.default.traversalQueue.count({ where: { urlId, status: 'pending' } }),
            prisma_1.default.traversalQueue.count({ where: { urlId, status: 'processing' } }),
            prisma_1.default.traversalQueue.count({ where: { urlId, status: 'completed' } }),
            prisma_1.default.traversalQueue.count({ where: { urlId, status: 'failed' } }),
        ]);
        return { pending, processing, completed, failed };
    }
}
exports.TraversalService = TraversalService;
exports.traversalService = new TraversalService();
//# sourceMappingURL=traversal.service.js.map