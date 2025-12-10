export declare const config: {
    port: number;
    jwtSecret: string;
    jwtExpiry: string;
    databaseUrl: string | undefined;
    redisUrl: string;
    screenshotDir: string;
    frontendUrl: string;
    nodeEnv: string;
    corsOrigins: string[];
    isProduction: boolean;
    render: {
        isRender: boolean;
        externalUrl: string | undefined;
        hostname: string | undefined;
    };
    railway: {
        isRailway: boolean;
        publicDomain: string | undefined;
    };
    heroku: {
        isHeroku: boolean;
        appName: string | undefined;
    };
};
export declare function logConfig(): void;
//# sourceMappingURL=index.d.ts.map