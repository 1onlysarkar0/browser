export declare class UrlService {
    create(userId: string, data: {
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
    }): Promise<any>;
    findAll(userId: string): Promise<any[]>;
    findById(id: string, userId: string): Promise<any>;
    update(id: string, userId: string, data: Partial<{
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
    }>): Promise<any>;
    delete(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    toggleStatus(id: string, userId: string): Promise<any>;
    getEnabledUrls(): Promise<any[]>;
    updateExecutionStatus(id: string, data: {
        lastRunAt?: Date;
        nextScheduledAt?: Date;
        lastErrorAt?: Date;
        errorCount?: number;
        successCount?: number;
    }): Promise<void>;
    private formatUrl;
}
export declare const urlService: UrlService;
//# sourceMappingURL=url.service.d.ts.map