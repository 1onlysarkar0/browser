export declare class SchedulerService {
    private cronJob;
    private isRunning;
    private activeExecutions;
    private startTime;
    private totalExecutionsSinceStart;
    start(): void;
    stop(): void;
    getStatus(): {
        isRunning: boolean;
        activeExecutions: string[];
        startTime: Date | null;
        uptime: number;
        totalExecutionsSinceStart: number;
    };
    private runRecoveryCheck;
    private checkAndExecuteUrls;
    private shouldRunUrl;
    private executeUrlAsync;
    manualExecute(urlId: string, userId: string): Promise<{
        message: string;
        urlId: string;
    }>;
    captureScreenshot(urlId: string, userId: string): Promise<{
        success: boolean;
        message: string;
        path: string;
    }>;
    startUrlAutomation(urlId: string, userId: string): Promise<{
        message: string;
    }>;
    stopUrlAutomation(urlId: string, userId: string): Promise<{
        message: string;
    }>;
}
export declare const schedulerService: SchedulerService;
//# sourceMappingURL=scheduler.service.d.ts.map