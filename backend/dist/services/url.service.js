"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlService = exports.UrlService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
class UrlService {
    async create(userId, data) {
        const url = await prisma_1.default.url.create({
            data: {
                userId,
                url: data.url,
                label: data.label,
                description: data.description,
                enabled: data.enabled ?? true,
                runIntervalSeconds: data.runIntervalSeconds ?? 1800,
                scheduleStartTime: data.scheduleStartTime,
                scheduleEndTime: data.scheduleEndTime,
                timezone: data.timezone ?? 'UTC',
                repeatCount: data.repeatCount,
                navigationLinks: JSON.stringify(data.navigationLinks ?? []),
                interactions: JSON.stringify(data.interactions ?? []),
                formDataMappings: data.formDataMappings ? JSON.stringify(data.formDataMappings) : null,
                delayBetweenActions: data.delayBetweenActions ?? 1000,
                randomBehaviorVariation: data.randomBehaviorVariation ?? 10,
                proxyUrl: data.proxyUrl,
                customHeaders: data.customHeaders ? JSON.stringify(data.customHeaders) : null,
                customCookies: data.customCookies ? JSON.stringify(data.customCookies) : null,
                customUserAgent: data.customUserAgent,
                javascriptCode: data.javascriptCode,
                networkThrottle: data.networkThrottle,
                screenshotInterval: data.screenshotInterval,
                errorNotifications: data.errorNotifications ?? false,
                performanceLogging: data.performanceLogging ?? true,
                nextScheduledAt: new Date(Date.now() + (data.runIntervalSeconds ?? 1800) * 1000),
            },
        });
        logger_1.default.info(`URL created: ${url.id}`);
        return this.formatUrl(url);
    }
    async findAll(userId) {
        const urls = await prisma_1.default.url.findMany({
            where: { userId },
            include: {
                screenshots: {
                    orderBy: { capturedAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return urls.map(url => this.formatUrl(url));
    }
    async findById(id, userId) {
        const url = await prisma_1.default.url.findFirst({
            where: { id, userId },
            include: {
                screenshots: {
                    orderBy: { capturedAt: 'desc' },
                    take: 5,
                },
                executionLogs: {
                    orderBy: { startedAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!url)
            return null;
        return this.formatUrl(url);
    }
    async update(id, userId, data) {
        const existing = await prisma_1.default.url.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new Error('URL not found');
        }
        const updateData = { ...data };
        if (data.navigationLinks) {
            updateData.navigationLinks = JSON.stringify(data.navigationLinks);
        }
        if (data.interactions) {
            updateData.interactions = JSON.stringify(data.interactions);
        }
        if (data.formDataMappings) {
            updateData.formDataMappings = JSON.stringify(data.formDataMappings);
        }
        if (data.customHeaders) {
            updateData.customHeaders = JSON.stringify(data.customHeaders);
        }
        if (data.customCookies) {
            updateData.customCookies = JSON.stringify(data.customCookies);
        }
        const url = await prisma_1.default.url.update({
            where: { id },
            data: updateData,
        });
        logger_1.default.info(`URL updated: ${url.id}`);
        return this.formatUrl(url);
    }
    async delete(id, userId) {
        const existing = await prisma_1.default.url.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new Error('URL not found');
        }
        await prisma_1.default.url.delete({ where: { id } });
        logger_1.default.info(`URL deleted: ${id}`);
        return { success: true };
    }
    async toggleStatus(id, userId) {
        const existing = await prisma_1.default.url.findFirst({ where: { id, userId } });
        if (!existing) {
            throw new Error('URL not found');
        }
        const url = await prisma_1.default.url.update({
            where: { id },
            data: { enabled: !existing.enabled },
        });
        return this.formatUrl(url);
    }
    async getEnabledUrls() {
        const urls = await prisma_1.default.url.findMany({
            where: { enabled: true },
        });
        return urls.map(url => this.formatUrl(url));
    }
    async updateExecutionStatus(id, data) {
        await prisma_1.default.url.update({
            where: { id },
            data,
        });
    }
    formatUrl(url) {
        return {
            ...url,
            navigationLinks: JSON.parse(url.navigationLinks || '[]'),
            interactions: JSON.parse(url.interactions || '[]'),
            formDataMappings: url.formDataMappings ? JSON.parse(url.formDataMappings) : null,
            customHeaders: url.customHeaders ? JSON.parse(url.customHeaders) : null,
            customCookies: url.customCookies ? JSON.parse(url.customCookies) : null,
        };
    }
}
exports.UrlService = UrlService;
exports.urlService = new UrlService();
//# sourceMappingURL=url.service.js.map