import { Page } from 'puppeteer';
export interface CaptureConfig {
    urlId: string;
    maxScreenshots: number;
    captureFullPage: boolean;
    captureViewport: boolean;
    captureElements?: string[];
}
export interface CaptureResult {
    screenshotId: string;
    fileName: string;
    filePath: string;
    pageUrl: string;
    pageTitle: string;
    width: number;
    height: number;
}
export declare class CaptureService {
    private screenshotCount;
    capturePageScreenshot(page: Page, urlId: string, pageIndex: number, maxScreenshots: number): Promise<CaptureResult | null>;
    captureViewportScreenshot(page: Page, urlId: string): Promise<CaptureResult | null>;
    captureElementScreenshot(page: Page, urlId: string, selector: string): Promise<CaptureResult | null>;
    captureMultipleSections(page: Page, urlId: string, scrollSteps?: number): Promise<CaptureResult[]>;
    resetCounter(urlId: string): void;
    getCount(urlId: string): number;
    private sleep;
}
export declare const captureService: CaptureService;
//# sourceMappingURL=capture.service.d.ts.map