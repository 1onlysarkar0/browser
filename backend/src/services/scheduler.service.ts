import cron, { ScheduledTask } from 'node-cron';
import { urlService } from './url.service';
import { automationService } from './automation.service';
import logger from '../utils/logger';
import { emitExecutionStart, emitExecutionComplete, emitUrlUpdate } from '../app';

export class SchedulerService {
  private cronJob: ScheduledTask | null = null;
  private isRunning: boolean = false;
  private activeExecutions: Map<string, boolean> = new Map();
  private startTime: Date | null = null;
  private totalExecutionsSinceStart: number = 0;

  start() {
    if (this.cronJob) {
      logger.warn('Scheduler already running');
      return;
    }

    this.cronJob = cron.schedule('*/30 * * * * *', async () => {
      await this.checkAndExecuteUrls();
    });

    this.isRunning = true;
    this.startTime = new Date();
    logger.info('Scheduler started - Always-On Mode - checking URLs every 30 seconds');

    this.runRecoveryCheck();
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
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      totalExecutionsSinceStart: this.totalExecutionsSinceStart,
    };
  }

  private async runRecoveryCheck() {
    try {
      logger.info('Running recovery check for overdue URLs...');
      const urls = await urlService.getEnabledUrls();
      const now = new Date();
      let recoveredCount = 0;

      for (const url of urls) {
        if (url.nextScheduledAt && new Date(url.nextScheduledAt) < now) {
          const missedMinutes = Math.floor((now.getTime() - new Date(url.nextScheduledAt).getTime()) / 60000);
          if (missedMinutes > 5) {
            logger.info(`URL ${url.label} was ${missedMinutes} minutes overdue, scheduling for immediate execution`);
            recoveredCount++;
          }
        }
      }

      if (recoveredCount > 0) {
        logger.info(`Recovery check complete: ${recoveredCount} URLs queued for immediate execution`);
      } else {
        logger.info('Recovery check complete: No overdue URLs found');
      }
    } catch (error: any) {
      logger.error(`Recovery check failed: ${error.message}`);
    }
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
    this.totalExecutionsSinceStart++;
    logger.info(`[Always-On] Starting execution for URL: ${url.label} (${url.id})`);

    try {
      emitExecutionStart(url.id, { urlId: url.id, startedAt: new Date() });
    } catch (e) {
    }

    try {
      const result = await automationService.executeUrl(url);
      
      if (result.success) {
        logger.info(`[Always-On] Execution completed for URL: ${url.label} - Duration: ${result.duration}ms`);
      } else {
        logger.error(`[Always-On] Execution failed for URL: ${url.label} - Error: ${result.error}`);
      }

      try {
        emitExecutionComplete(url.id, { 
          urlId: url.id, 
          success: result.success, 
          duration: result.duration,
          completedAt: new Date() 
        });
        emitUrlUpdate(url.id, { urlId: url.id, lastRunAt: new Date() });
      } catch (e) {
      }
    } catch (error: any) {
      logger.error(`[Always-On] Unexpected error executing URL ${url.id}: ${error.message}`);
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
    return { message: 'Execution started', urlId };
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

  async startUrlAutomation(urlId: string, userId: string) {
    const url = await urlService.findById(urlId, userId);
    if (!url) {
      throw new Error('URL not found');
    }

    await urlService.update(urlId, userId, { enabled: true });
    logger.info(`[Always-On] URL automation started: ${url.label}`);
    return { message: 'Automation started - URL will now run on schedule' };
  }

  async stopUrlAutomation(urlId: string, userId: string) {
    const url = await urlService.findById(urlId, userId);
    if (!url) {
      throw new Error('URL not found');
    }

    await urlService.update(urlId, userId, { enabled: false });
    logger.info(`[Always-On] URL automation stopped: ${url.label}`);
    return { message: 'Automation stopped' };
  }
}

export const schedulerService = new SchedulerService();
