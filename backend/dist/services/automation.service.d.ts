import { Browser, Page } from 'puppeteer';
import { ExecutionResult } from '../types';
export interface AutomationResult extends ExecutionResult {
    pagesVisited: number;
    dataScraped: number;
    changesDetected: number;
}
export declare class AutomationService {
    private browser;
    private browserLock;
    private isBrowserConnected;
    initialize(): Promise<Browser | null>;
    closeBrowser(): Promise<void>;
    executeUrl(urlConfig: any): Promise<AutomationResult>;
    private runAutoTraversal;
    private executeStep;
    private humanClick;
    private humanType;
    private humanMouseMove;
    private humanScroll;
    private humanScrollToBottom;
    private humanHover;
    private humanDragAndDrop;
    captureScreenshot(page: Page, urlId: string, selector?: string): Promise<string>;
    private getRandomDelay;
    private sleep;
    captureScreenshotOnly(urlConfig: any): Promise<string>;
    close(): Promise<void>;
}
export declare const automationService: AutomationService;
//# sourceMappingURL=automation.service.d.ts.map