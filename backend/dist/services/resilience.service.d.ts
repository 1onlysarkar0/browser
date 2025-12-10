import { Page } from 'puppeteer';
export interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}
export interface SelectorFallback {
    primary: string;
    fallbacks: string[];
}
export declare class ResilienceService {
    private circuitBreaker;
    private readonly circuitThreshold;
    private readonly circuitResetTime;
    withRetry<T>(operation: () => Promise<T>, operationName: string, config?: Partial<RetryConfig>): Promise<T>;
    findWithFallbacks(page: Page, selectorConfig: SelectorFallback, timeout?: number): Promise<string | null>;
    smartClick(page: Page, selectorConfig: SelectorFallback, timeout?: number): Promise<boolean>;
    isCircuitOpen(key: string): boolean;
    recordFailure(key: string): void;
    recordSuccess(key: string): void;
    waitForPageStable(page: Page, timeout?: number): Promise<void>;
    safeNavigate(page: Page, url: string, options?: {
        timeout?: number;
        waitUntil?: 'load' | 'networkidle0' | 'networkidle2' | 'domcontentloaded';
    }): Promise<boolean>;
    handlePopups(page: Page): Promise<void>;
    private sleep;
}
export declare const resilienceService: ResilienceService;
//# sourceMappingURL=resilience.service.d.ts.map