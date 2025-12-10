import prisma from '../utils/prisma';
import logger from '../utils/logger';

export class UrlService {
  async create(userId: string, data: {
    url: string;
    label: string;
    description?: string;
    enabled?: boolean;
    runIntervalSeconds?: number;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    timezone?: string;
    repeatCount?: number;
    navigationLinks?: string[];
    interactions?: any[];
    formDataMappings?: Record<string, string>;
    delayBetweenActions?: number;
    randomBehaviorVariation?: number;
    proxyUrl?: string;
    customHeaders?: Record<string, string>;
    customCookies?: Record<string, string>;
    customUserAgent?: string;
    javascriptCode?: string;
    networkThrottle?: string;
    screenshotInterval?: number;
    errorNotifications?: boolean;
    performanceLogging?: boolean;
  }) {
    const url = await prisma.url.create({
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

    logger.info(`URL created: ${url.id}`);
    return this.formatUrl(url);
  }

  async findAll(userId: string) {
    const urls = await prisma.url.findMany({
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

  async findById(id: string, userId: string) {
    const url = await prisma.url.findFirst({
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

    if (!url) return null;
    return this.formatUrl(url);
  }

  async update(id: string, userId: string, data: Partial<{
    url: string;
    label: string;
    description: string;
    enabled: boolean;
    runIntervalSeconds: number;
    scheduleStartTime: string;
    scheduleEndTime: string;
    timezone: string;
    repeatCount: number;
    navigationLinks: string[];
    interactions: any[];
    formDataMappings: Record<string, string>;
    delayBetweenActions: number;
    randomBehaviorVariation: number;
    proxyUrl: string;
    customHeaders: Record<string, string>;
    customCookies: Record<string, string>;
    customUserAgent: string;
    javascriptCode: string;
    networkThrottle: string;
    screenshotInterval: number;
    errorNotifications: boolean;
    performanceLogging: boolean;
  }>) {
    const existing = await prisma.url.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new Error('URL not found');
    }

    const updateData: any = { ...data };
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

    const url = await prisma.url.update({
      where: { id },
      data: updateData,
    });

    logger.info(`URL updated: ${url.id}`);
    return this.formatUrl(url);
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.url.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new Error('URL not found');
    }

    await prisma.url.delete({ where: { id } });
    logger.info(`URL deleted: ${id}`);
    return { success: true };
  }

  async toggleStatus(id: string, userId: string) {
    const existing = await prisma.url.findFirst({ where: { id, userId } });
    if (!existing) {
      throw new Error('URL not found');
    }

    const url = await prisma.url.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });

    return this.formatUrl(url);
  }

  async getEnabledUrls() {
    const urls = await prisma.url.findMany({
      where: { enabled: true },
    });

    return urls.map(url => this.formatUrl(url));
  }

  async updateExecutionStatus(id: string, data: {
    lastRunAt?: Date;
    nextScheduledAt?: Date;
    lastErrorAt?: Date;
    errorCount?: number;
    successCount?: number;
  }) {
    await prisma.url.update({
      where: { id },
      data,
    });
  }

  private formatUrl(url: any) {
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

export const urlService = new UrlService();
