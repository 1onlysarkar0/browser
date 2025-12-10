import cron from 'node-cron';
import { urlService } from './url.service';
import { automationService } from './automation.service';
import logger from '../utils/logger';

export class SchedulerService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private activeExecutions: Map<string, boolean> = new Map();

  start() {
    if (this.cronJob) {
      logger.warn('Scheduler already running');
      return;
    }

    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkAndExecuteUrls();
    });

    this.isRunning = true;
    logger.info('Scheduler started - checking URLs every minute');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      logger.info('Scheduler stopped');
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      activeExecutions: Array.from(this.activeExecutions.keys()),
    };
  }

  private async checkAndExecuteUrls() {
    try {
      const urls = await urlService.getEnabledUrls();
      const now = new Date();

      for (const url of urls) {
        if (this.activeExecutions.get(url.id)) {
          logger.debug(`URL ${url.id} already executing, skipping`);
          continue;
        }

        const shouldRun = this.shouldRunUrl(url, now);
        if (shouldRun) {
          this.executeUrlAsync(url);
        }
      }
    } catch (error: any) {
      logger.error(`Scheduler error: ${error.message}`);
    }
  }

  private shouldRunUrl(url: any, now: Date): boolean {
    if (!url.nextScheduledAt) {
      return true;
    }

    const nextScheduled = new Date(url.nextScheduledAt);
    if (now < nextScheduled) {
      return false;
    }

    if (url.scheduleStartTime && url.scheduleEndTime) {
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: url.timezone || 'UTC',
      });

      if (currentTime < url.scheduleStartTime || currentTime > url.scheduleEndTime) {
        return false;
      }
    }

    return true;
  }

  private async executeUrlAsync(url: any) {
    this.activeExecutions.set(url.id, true);
    logger.info(`Starting execution for URL: ${url.label} (${url.id})`);

    try {
      const result = await automationService.executeUrl(url);
      
      if (result.success) {
        logger.info(`Execution completed for URL: ${url.label} - Duration: ${result.duration}ms`);
      } else {
        logger.error(`Execution failed for URL: ${url.label} - Error: ${result.error}`);
      }
    } catch (error: any) {
      logger.error(`Unexpected error executing URL ${url.id}: ${error.message}`);
    } finally {
      this.activeExecutions.delete(url.id);
    }
  }

  async manualExecute(urlId: string, userId: string) {
    const url = await urlService.findById(urlId, userId);
    if (!url) {
      throw new Error('URL not found');
    }

    if (this.activeExecutions.get(urlId)) {
      throw new Error('URL is already being executed');
    }

    this.executeUrlAsync(url);
    return { message: 'Execution started' };
  }

  async captureScreenshot(urlId: string, userId: string) {
    const url = await urlService.findById(urlId, userId);
    if (!url) {
      throw new Error('URL not found');
    }

    logger.info(`Capturing screenshot for URL: ${url.label} (${url.id})`);
    
    try {
      const screenshotPath = await automationService.captureScreenshotOnly(url);
      return { 
        success: true, 
        message: 'Screenshot captured',
        path: screenshotPath 
      };
    } catch (error: any) {
      logger.error(`Screenshot capture failed for URL ${urlId}: ${error.message}`);
      throw error;
    }
  }
}

export const schedulerService = new SchedulerService();
