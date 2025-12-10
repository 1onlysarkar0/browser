export declare class ScreenshotService {
    findByUrlId(urlId: string, userId: string, limit?: number, offset?: number): Promise<{
        screenshots: {
            id: string;
            createdAt: Date;
            urlId: string;
            filePath: string;
            fileName: string;
            width: number;
            height: number;
            fileSize: number;
            pageUrl: string | null;
            pageTitle: string | null;
            capturedAt: Date;
        }[];
        total: number;
        limit: number;
        offset: number;
    }>;
    findById(id: string, userId: string): Promise<{
        url: {
            userId: string;
        };
    } & {
        id: string;
        createdAt: Date;
        urlId: string;
        filePath: string;
        fileName: string;
        width: number;
        height: number;
        fileSize: number;
        pageUrl: string | null;
        pageTitle: string | null;
        capturedAt: Date;
    }>;
    delete(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    getFile(id: string, userId: string): Promise<{
        filePath: string;
        fileName: string;
    }>;
    cleanup(urlId: string, maxAge?: number): Promise<{
        deleted: number;
    }>;
    getAllForUser(userId: string, limit?: number, offset?: number): Promise<{
        screenshots: ({
            url: {
                url: string;
                label: string;
            };
        } & {
            id: string;
            createdAt: Date;
            urlId: string;
            filePath: string;
            fileName: string;
            width: number;
            height: number;
            fileSize: number;
            pageUrl: string | null;
            pageTitle: string | null;
            capturedAt: Date;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    deleteAll(userId: string): Promise<number>;
}
export declare const screenshotService: ScreenshotService;
//# sourceMappingURL=screenshot.service.d.ts.map