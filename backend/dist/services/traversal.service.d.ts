import { Page } from 'puppeteer';
export interface TraversalConfig {
    urlId: string;
    maxDepth: number;
    maxPages: number;
    followExternalLinks: boolean;
    paginationSelector?: string;
    baseUrl: string;
}
export interface PageInfo {
    url: string;
    title: string;
    depth: number;
    links: string[];
    contentHash: string;
    htmlLength: number;
}
export declare class TraversalService {
    private visitedUrls;
    private pageQueue;
    initializeQueue(config: TraversalConfig): Promise<void>;
    getNextPage(urlId: string): Promise<{
        pageUrl: string;
        depth: number;
    } | null>;
    markPageComplete(urlId: string, pageUrl: string): Promise<void>;
    markPageFailed(urlId: string, pageUrl: string): Promise<void>;
    addToQueue(urlId: string, pageUrl: string, depth: number, priority?: number): Promise<boolean>;
    extractPageInfo(page: Page, depth: number): Promise<PageInfo>;
    discoverLinks(page: Page, config: TraversalConfig, currentDepth: number): Promise<string[]>;
    handlePagination(page: Page, paginationSelector: string): Promise<boolean>;
    recordPageVisit(urlId: string, pageInfo: PageInfo): Promise<void>;
    getQueueStatus(urlId: string): Promise<{
        pending: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
}
export declare const traversalService: TraversalService;
//# sourceMappingURL=traversal.service.d.ts.map