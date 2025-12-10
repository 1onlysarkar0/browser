import { Page } from 'puppeteer';
export interface ScrapeSelector {
    name: string;
    selector: string;
    attribute?: string;
    multiple?: boolean;
    type?: 'text' | 'html' | 'attribute' | 'link';
}
export interface ScrapeResult {
    pageUrl: string;
    data: Record<string, any>;
    itemCount: number;
}
export declare class ScraperService {
    scrapeWithSelectors(page: Page, urlId: string, selectors: ScrapeSelector[]): Promise<ScrapeResult>;
    private extractData;
    private saveScrapedData;
    autoScrape(page: Page, urlId: string): Promise<ScrapeResult>;
    getScrapedDataForUrl(urlId: string): Promise<any[]>;
    clearScrapedData(urlId: string): Promise<void>;
}
export declare const scraperService: ScraperService;
//# sourceMappingURL=scraper.service.d.ts.map