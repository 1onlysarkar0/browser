"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scraperService = exports.ScraperService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
class ScraperService {
    async scrapeWithSelectors(page, urlId, selectors) {
        const pageUrl = page.url();
        const data = {};
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
                }
                else if (result) {
                    await this.saveScrapedData(urlId, pageUrl, selector, String(result));
                }
            }
            catch (error) {
                logger_1.default.warn(`[Scraper] Failed to extract ${selector.name}: ${error.message}`);
                data[selector.name] = null;
            }
        }
        logger_1.default.info(`[Scraper] Scraped ${itemCount} items from ${pageUrl}`);
        return { pageUrl, data, itemCount };
    }
    async extractData(page, selector) {
        const type = selector.type || 'text';
        if (selector.multiple) {
            return page.$$eval(selector.selector, (elements, attr, dataType) => {
                return elements.map((el) => {
                    if (dataType === 'html')
                        return el.innerHTML;
                    if (dataType === 'link')
                        return el.href;
                    if (dataType === 'attribute' && attr)
                        return el.getAttribute(attr);
                    return el.textContent?.trim() || '';
                });
            }, selector.attribute, type);
        }
        else {
            return page.$eval(selector.selector, (el, attr, dataType) => {
                if (dataType === 'html')
                    return el.innerHTML;
                if (dataType === 'link')
                    return el.href;
                if (dataType === 'attribute' && attr)
                    return el.getAttribute(attr);
                return el.textContent?.trim() || '';
            }, selector.attribute, type).catch(() => null);
        }
    }
    async saveScrapedData(urlId, pageUrl, selector, value) {
        await prisma_1.default.scrapedData.create({
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
    async autoScrape(page, urlId) {
        const pageUrl = page.url();
        const data = {};
        const autoData = await page.evaluate(() => {
            const result = {};
            const title = document.title;
            if (title)
                result.pageTitle = title;
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc)
                result.metaDescription = metaDesc.getAttribute('content');
            const h1 = document.querySelector('h1');
            if (h1)
                result.mainHeading = h1.textContent?.trim();
            const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
                .slice(0, 10)
                .map((h) => ({ tag: h.tagName, text: h.textContent?.trim() }));
            result.headings = headings;
            const images = Array.from(document.querySelectorAll('img[src]'))
                .slice(0, 20)
                .map((img) => ({
                src: img.src,
                alt: img.getAttribute('alt'),
            }));
            result.images = images;
            const links = Array.from(document.querySelectorAll('a[href]'))
                .slice(0, 50)
                .map((a) => ({
                href: a.href,
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
                await prisma_1.default.scrapedData.create({
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
        logger_1.default.info(`[Scraper] Auto-scraped ${itemCount} data points from ${pageUrl}`);
        return { pageUrl, data, itemCount };
    }
    async getScrapedDataForUrl(urlId) {
        return prisma_1.default.scrapedData.findMany({
            where: { urlId },
            orderBy: { scrapedAt: 'desc' },
            take: 1000,
        });
    }
    async clearScrapedData(urlId) {
        await prisma_1.default.scrapedData.deleteMany({
            where: { urlId },
        });
    }
}
exports.ScraperService = ScraperService;
exports.scraperService = new ScraperService();
//# sourceMappingURL=scraper.service.js.map