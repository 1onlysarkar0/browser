"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotService = exports.ScreenshotService = void 0;
const fs_1 = __importDefault(require("fs"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const logger_1 = __importDefault(require("../utils/logger"));
class ScreenshotService {
    async findByUrlId(urlId, userId, limit = 50, offset = 0) {
        const url = await prisma_1.default.url.findFirst({
            where: { id: urlId, userId },
        });
        if (!url) {
            throw new Error('URL not found');
        }
        const screenshots = await prisma_1.default.screenshot.findMany({
            where: { urlId },
            orderBy: { capturedAt: 'desc' },
            take: limit,
            skip: offset,
        });
        const total = await prisma_1.default.screenshot.count({ where: { urlId } });
        return {
            screenshots,
            total,
            limit,
            offset,
        };
    }
    async findById(id, userId) {
        const screenshot = await prisma_1.default.screenshot.findFirst({
            where: { id },
            include: {
                url: {
                    select: { userId: true },
                },
            },
        });
        if (!screenshot || screenshot.url.userId !== userId) {
            throw new Error('Screenshot not found');
        }
        return screenshot;
    }
    async delete(id, userId) {
        const screenshot = await this.findById(id, userId);
        if (fs_1.default.existsSync(screenshot.filePath)) {
            fs_1.default.unlinkSync(screenshot.filePath);
        }
        await prisma_1.default.screenshot.delete({ where: { id } });
        logger_1.default.info(`Screenshot deleted: ${id}`);
        return { success: true };
    }
    async getFile(id, userId) {
        const screenshot = await this.findById(id, userId);
        if (!fs_1.default.existsSync(screenshot.filePath)) {
            throw new Error('Screenshot file not found');
        }
        return {
            filePath: screenshot.filePath,
            fileName: screenshot.fileName,
        };
    }
    async cleanup(urlId, maxAge = 7 * 24 * 60 * 60 * 1000) {
        const cutoffDate = new Date(Date.now() - maxAge);
        const oldScreenshots = await prisma_1.default.screenshot.findMany({
            where: {
                urlId,
                capturedAt: { lt: cutoffDate },
            },
        });
        for (const screenshot of oldScreenshots) {
            if (fs_1.default.existsSync(screenshot.filePath)) {
                fs_1.default.unlinkSync(screenshot.filePath);
            }
        }
        await prisma_1.default.screenshot.deleteMany({
            where: {
                urlId,
                capturedAt: { lt: cutoffDate },
            },
        });
        logger_1.default.info(`Cleaned up ${oldScreenshots.length} old screenshots for URL ${urlId}`);
        return { deleted: oldScreenshots.length };
    }
    async getAllForUser(userId, limit = 50, offset = 0) {
        const screenshots = await prisma_1.default.screenshot.findMany({
            where: {
                url: { userId },
            },
            include: {
                url: {
                    select: { label: true, url: true },
                },
            },
            orderBy: { capturedAt: 'desc' },
            take: limit,
            skip: offset,
        });
        const total = await prisma_1.default.screenshot.count({
            where: {
                url: { userId },
            },
        });
        return {
            screenshots,
            total,
            limit,
            offset,
        };
    }
    async deleteAll(userId) {
        const screenshots = await prisma_1.default.screenshot.findMany({
            where: {
                url: { userId },
            },
            select: { id: true, filePath: true },
        });
        const count = screenshots.length;
        await prisma_1.default.screenshot.deleteMany({
            where: {
                url: { userId },
            },
        });
        let filesDeleted = 0;
        let fileErrors = 0;
        for (const screenshot of screenshots) {
            try {
                if (fs_1.default.existsSync(screenshot.filePath)) {
                    fs_1.default.unlinkSync(screenshot.filePath);
                    filesDeleted++;
                }
            }
            catch (error) {
                fileErrors++;
                logger_1.default.warn(`Failed to delete screenshot file ${screenshot.filePath}: ${error.message}`);
            }
        }
        logger_1.default.info(`Deleted ${count} screenshot records for user ${userId} (${filesDeleted} files removed, ${fileErrors} file errors)`);
        return count;
    }
}
exports.ScreenshotService = ScreenshotService;
exports.screenshotService = new ScreenshotService();
//# sourceMappingURL=screenshot.service.js.map