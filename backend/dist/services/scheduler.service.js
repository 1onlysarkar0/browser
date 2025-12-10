"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const url_service_1 = require("./url.service");
const automation_service_1 = require("./automation.service");
const logger_1 = __importDefault(require("../utils/logger"));
const app_1 = require("../app");
class SchedulerService {
    cronJob = null;
    isRunning = false;
    activeExecutions = new Map();
    startTime = null;
    totalExecutionsSinceStart = 0;
    start() {
        if (this.cronJob) {
            logger_1.default.warn('Scheduler already running');
            return;
        }
        this.cronJob = node_cron_1.default.schedule('*/30 * * * * *', async () => {
            await this.checkAndExecuteUrls();
        });
        this.isRunning = true;
        this.startTime = new Date();
        logger_1.default.info('Scheduler started - Always-On Mode - checking URLs every 30 seconds');
        this.runRecoveryCheck();
    }
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            this.isRunning = false;
            logger_1.default.info('Scheduler stopped');
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
    async runRecoveryCheck() {
        try {
            logger_1.default.info('Running recovery check for overdue URLs...');
            const urls = await url_service_1.urlService.getEnabledUrls();
            const now = new Date();
            let recoveredCount = 0;
            for (const url of urls) {
                if (url.nextScheduledAt && new Date(url.nextScheduledAt) < now) {
                    const missedMinutes = Math.floor((now.getTime() - new Date(url.nextScheduledAt).getTime()) / 60000);
                    if (missedMinutes > 5) {
                        logger_1.default.info(`URL ${url.label} was ${missedMinutes} minutes overdue, scheduling for immediate execution`);
                        recoveredCount++;
                    }
                }
            }
            if (recoveredCount > 0) {
                logger_1.default.info(`Recovery check complete: ${recoveredCount} URLs queued for immediate execution`);
            }
            else {
                logger_1.default.info('Recovery check complete: No overdue URLs found');
            }
        }
        catch (error) {
            logger_1.default.error(`Recovery check failed: ${error.message}`);
        }
    }
    async checkAndExecuteUrls() {
        try {
            const urls = await url_service_1.urlService.getEnabledUrls();
            const now = new Date();
            for (const url of urls) {
                if (this.activeExecutions.get(url.id)) {
                    logger_1.default.debug(`URL ${url.id} already executing, skipping`);
                    continue;
                }
                const shouldRun = this.shouldRunUrl(url, now);
                if (shouldRun) {
                    this.executeUrlAsync(url);
                }
            }
        }
        catch (error) {
            logger_1.default.error(`Scheduler error: ${error.message}`);
        }
    }
    shouldRunUrl(url, now) {
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
    async executeUrlAsync(url) {
        this.activeExecutions.set(url.id, true);
        this.totalExecutionsSinceStart++;
        logger_1.default.info(`[Always-On] Starting execution for URL: ${url.label} (${url.id})`);
        try {
            (0, app_1.emitExecutionStart)(url.id, { urlId: url.id, startedAt: new Date() });
        }
        catch (e) {
        }
        try {
            const result = await automation_service_1.automationService.executeUrl(url);
            if (result.success) {
                logger_1.default.info(`[Always-On] Execution completed for URL: ${url.label} - Duration: ${result.duration}ms`);
            }
            else {
                logger_1.default.error(`[Always-On] Execution failed for URL: ${url.label} - Error: ${result.error}`);
            }
            try {
                (0, app_1.emitExecutionComplete)(url.id, {
                    urlId: url.id,
                    success: result.success,
                    duration: result.duration,
                    completedAt: new Date()
                });
                (0, app_1.emitUrlUpdate)(url.id, { urlId: url.id, lastRunAt: new Date() });
            }
            catch (e) {
            }
        }
        catch (error) {
            logger_1.default.error(`[Always-On] Unexpected error executing URL ${url.id}: ${error.message}`);
        }
        finally {
            this.activeExecutions.delete(url.id);
        }
    }
    async manualExecute(urlId, userId) {
        const url = await url_service_1.urlService.findById(urlId, userId);
        if (!url) {
            throw new Error('URL not found');
        }
        if (this.activeExecutions.get(urlId)) {
            throw new Error('URL is already being executed');
        }
        this.executeUrlAsync(url);
        return { message: 'Execution started', urlId };
    }
    async captureScreenshot(urlId, userId) {
        const url = await url_service_1.urlService.findById(urlId, userId);
        if (!url) {
            throw new Error('URL not found');
        }
        logger_1.default.info(`Capturing screenshot for URL: ${url.label} (${url.id})`);
        try {
            const screenshotPath = await automation_service_1.automationService.captureScreenshotOnly(url);
            return {
                success: true,
                message: 'Screenshot captured',
                path: screenshotPath
            };
        }
        catch (error) {
            logger_1.default.error(`Screenshot capture failed for URL ${urlId}: ${error.message}`);
            throw error;
        }
    }
    async startUrlAutomation(urlId, userId) {
        const url = await url_service_1.urlService.findById(urlId, userId);
        if (!url) {
            throw new Error('URL not found');
        }
        await url_service_1.urlService.update(urlId, userId, { enabled: true });
        logger_1.default.info(`[Always-On] URL automation started: ${url.label}`);
        return { message: 'Automation started - URL will now run on schedule' };
    }
    async stopUrlAutomation(urlId, userId) {
        const url = await url_service_1.urlService.findById(urlId, userId);
        if (!url) {
            throw new Error('URL not found');
        }
        await url_service_1.urlService.update(urlId, userId, { enabled: false });
        logger_1.default.info(`[Always-On] URL automation stopped: ${url.label}`);
        return { message: 'Automation stopped' };
    }
}
exports.SchedulerService = SchedulerService;
exports.schedulerService = new SchedulerService();
//# sourceMappingURL=scheduler.service.js.map