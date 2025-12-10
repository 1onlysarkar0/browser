"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeDetectionService = exports.ChangeDetectionService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
class ChangeDetectionService {
    async detectChanges(page, urlId, threshold = 10) {
        const pageUrl = page.url();
        const { html, htmlLength } = await page.evaluate(() => ({
            html: document.documentElement.outerHTML,
            htmlLength: document.documentElement.outerHTML.length,
        }));
        const cleanedHtml = this.cleanHtmlForComparison(html);
        const currentHash = crypto_1.default.createHash('md5').update(cleanedHtml).digest('hex');
        const previousSnapshot = await prisma_1.default.pageSnapshot.findFirst({
            where: { urlId, pageUrl },
            orderBy: { capturedAt: 'desc' },
        });
        let hasChanged = false;
        let changePercent = 0;
        if (previousSnapshot) {
            if (previousSnapshot.contentHash !== currentHash) {
                changePercent = this.calculateChangePercent(previousSnapshot.htmlLength, htmlLength);
                hasChanged = changePercent >= threshold;
                if (hasChanged) {
                    logger_1.default.info(`[ChangeDetection] Change detected on ${pageUrl}: ${changePercent.toFixed(1)}% change`);
                }
            }
        }
        else {
            hasChanged = true;
            changePercent = 100;
        }
        await prisma_1.default.pageSnapshot.create({
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
    cleanHtmlForComparison(html) {
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
    calculateChangePercent(oldLength, newLength) {
        if (oldLength === 0)
            return 100;
        const diff = Math.abs(newLength - oldLength);
        return (diff / oldLength) * 100;
    }
    async getChangeHistory(urlId, pageUrl) {
        return prisma_1.default.pageSnapshot.findMany({
            where: pageUrl ? { urlId, pageUrl } : { urlId },
            orderBy: { capturedAt: 'desc' },
            take: 100,
        });
    }
    async clearSnapshots(urlId) {
        await prisma_1.default.pageSnapshot.deleteMany({
            where: { urlId },
        });
    }
    async getLatestSnapshot(urlId, pageUrl) {
        return prisma_1.default.pageSnapshot.findFirst({
            where: { urlId, pageUrl },
            orderBy: { capturedAt: 'desc' },
        });
    }
}
exports.ChangeDetectionService = ChangeDetectionService;
exports.changeDetectionService = new ChangeDetectionService();
//# sourceMappingURL=change-detection.service.js.map