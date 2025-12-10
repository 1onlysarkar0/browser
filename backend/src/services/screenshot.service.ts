import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

export class ScreenshotService {
  async findByUrlId(urlId: string, userId: string, limit = 50, offset = 0) {
    const url = await prisma.url.findFirst({
      where: { id: urlId, userId },
    });

    if (!url) {
      throw new Error('URL not found');
    }

    const screenshots = await prisma.screenshot.findMany({
      where: { urlId },
      orderBy: { capturedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.screenshot.count({ where: { urlId } });

    return {
      screenshots,
      total,
      limit,
      offset,
    };
  }

  async findById(id: string, userId: string) {
    const screenshot = await prisma.screenshot.findFirst({
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

  async delete(id: string, userId: string) {
    const screenshot = await this.findById(id, userId);

    if (fs.existsSync(screenshot.filePath)) {
      fs.unlinkSync(screenshot.filePath);
    }

    await prisma.screenshot.delete({ where: { id } });
    logger.info(`Screenshot deleted: ${id}`);

    return { success: true };
  }

  async getFile(id: string, userId: string) {
    const screenshot = await this.findById(id, userId);

    if (!fs.existsSync(screenshot.filePath)) {
      throw new Error('Screenshot file not found');
    }

    return {
      filePath: screenshot.filePath,
      fileName: screenshot.fileName,
    };
  }

  async cleanup(urlId: string, maxAge: number = 7 * 24 * 60 * 60 * 1000) {
    const cutoffDate = new Date(Date.now() - maxAge);

    const oldScreenshots = await prisma.screenshot.findMany({
      where: {
        urlId,
        capturedAt: { lt: cutoffDate },
      },
    });

    for (const screenshot of oldScreenshots) {
      if (fs.existsSync(screenshot.filePath)) {
        fs.unlinkSync(screenshot.filePath);
      }
    }

    await prisma.screenshot.deleteMany({
      where: {
        urlId,
        capturedAt: { lt: cutoffDate },
      },
    });

    logger.info(`Cleaned up ${oldScreenshots.length} old screenshots for URL ${urlId}`);
    return { deleted: oldScreenshots.length };
  }

  async getAllForUser(userId: string, limit = 50, offset = 0) {
    const screenshots = await prisma.screenshot.findMany({
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

    const total = await prisma.screenshot.count({
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

  async deleteAll(userId: string) {
    const screenshots = await prisma.screenshot.findMany({
      where: {
        url: { userId },
      },
      select: { id: true, filePath: true },
    });

    const count = screenshots.length;

    await prisma.screenshot.deleteMany({
      where: {
        url: { userId },
      },
    });

    let filesDeleted = 0;
    let fileErrors = 0;
    for (const screenshot of screenshots) {
      try {
        if (fs.existsSync(screenshot.filePath)) {
          fs.unlinkSync(screenshot.filePath);
          filesDeleted++;
        }
      } catch (error) {
        fileErrors++;
        logger.warn(`Failed to delete screenshot file ${screenshot.filePath}: ${(error as Error).message}`);
      }
    }

    logger.info(`Deleted ${count} screenshot records for user ${userId} (${filesDeleted} files removed, ${fileErrors} file errors)`);
    return count;
  }
}

export const screenshotService = new ScreenshotService();
