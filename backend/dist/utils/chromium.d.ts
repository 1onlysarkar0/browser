export declare function resolveChromiumPath(): string | undefined;
export declare function getPuppeteerArgs(): string[];
export declare function getPuppeteerConfig(): {
    executablePath: string | undefined;
    args: string[];
    headless: boolean;
    ignoreHTTPSErrors: boolean;
    timeout: number;
    protocolTimeout: number;
    defaultViewport: {
        width: number;
        height: number;
        deviceScaleFactor: number;
    };
};
export declare function validateChromiumSetup(): {
    valid: boolean;
    path?: string;
    error?: string;
};
//# sourceMappingURL=chromium.d.ts.map