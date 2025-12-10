import { Page } from 'puppeteer';
export interface ChangeResult {
    hasChanged: boolean;
    changePercent: number;
    previousHash?: string;
    currentHash: string;
}
export declare class ChangeDetectionService {
    detectChanges(page: Page, urlId: string, threshold?: number): Promise<ChangeResult>;
    private cleanHtmlForComparison;
    private calculateChangePercent;
    getChangeHistory(urlId: string, pageUrl?: string): Promise<any[]>;
    clearSnapshots(urlId: string): Promise<void>;
    getLatestSnapshot(urlId: string, pageUrl: string): Promise<any | null>;
}
export declare const changeDetectionService: ChangeDetectionService;
//# sourceMappingURL=change-detection.service.d.ts.map