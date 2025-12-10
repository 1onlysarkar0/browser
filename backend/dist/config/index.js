"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.logConfig = logConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function getPort() {
    if (process.env.PORT) {
        return parseInt(process.env.PORT, 10);
    }
    if (process.env.RENDER || process.env.RENDER_SERVICE_ID) {
        return parseInt(process.env.PORT || '10000', 10);
    }
    if (process.env.RAILWAY_ENVIRONMENT) {
        return parseInt(process.env.PORT || '3000', 10);
    }
    if (process.env.DYNO) {
        return parseInt(process.env.PORT || '3000', 10);
    }
    return 3001;
}
function getFrontendUrl() {
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL;
    }
    if (process.env.RENDER_EXTERNAL_URL) {
        const backendUrl = process.env.RENDER_EXTERNAL_URL;
        return backendUrl.replace('-api', '').replace('api-', '');
    }
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    return 'http://localhost:5000';
}
function getDatabaseUrl() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    if (process.env.DATABASE_PRIVATE_URL) {
        return process.env.DATABASE_PRIVATE_URL;
    }
    if (process.env.POSTGRES_URL) {
        return process.env.POSTGRES_URL;
    }
    return undefined;
}
function getRedisUrl() {
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    if (process.env.REDIS_PRIVATE_URL) {
        return process.env.REDIS_PRIVATE_URL;
    }
    if (process.env.REDISCLOUD_URL) {
        return process.env.REDISCLOUD_URL;
    }
    return 'redis://localhost:6379';
}
function getEnvironment() {
    if (process.env.NODE_ENV) {
        return process.env.NODE_ENV;
    }
    if (process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.DYNO) {
        return 'production';
    }
    return 'development';
}
function getCorsOrigins() {
    const origins = [];
    if (process.env.CORS_ORIGINS) {
        origins.push(...process.env.CORS_ORIGINS.split(',').map(o => o.trim()));
    }
    const frontendUrl = getFrontendUrl();
    if (frontendUrl && !origins.includes(frontendUrl)) {
        origins.push(frontendUrl);
    }
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        origins.push(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
    }
    if (getEnvironment() === 'development') {
        origins.push('http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000');
    }
    return [...new Set(origins)];
}
exports.config = {
    port: getPort(),
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    databaseUrl: getDatabaseUrl(),
    redisUrl: getRedisUrl(),
    screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
    frontendUrl: getFrontendUrl(),
    nodeEnv: getEnvironment(),
    corsOrigins: getCorsOrigins(),
    isProduction: getEnvironment() === 'production',
    render: {
        isRender: !!(process.env.RENDER || process.env.RENDER_SERVICE_ID),
        externalUrl: process.env.RENDER_EXTERNAL_URL,
        hostname: process.env.RENDER_EXTERNAL_HOSTNAME,
    },
    railway: {
        isRailway: !!process.env.RAILWAY_ENVIRONMENT,
        publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
    },
    heroku: {
        isHeroku: !!process.env.DYNO,
        appName: process.env.HEROKU_APP_NAME,
    },
};
function logConfig() {
    console.log('=== Application Configuration ===');
    console.log(`Environment: ${exports.config.nodeEnv}`);
    console.log(`Port: ${exports.config.port}`);
    console.log(`Frontend URL: ${exports.config.frontendUrl}`);
    console.log(`Database: ${exports.config.databaseUrl ? 'Configured' : 'Not configured'}`);
    console.log(`Redis: ${exports.config.redisUrl}`);
    console.log(`CORS Origins: ${exports.config.corsOrigins.join(', ')}`);
    if (exports.config.render.isRender) {
        console.log('Platform: Render');
        console.log(`External URL: ${exports.config.render.externalUrl}`);
    }
    else if (exports.config.railway.isRailway) {
        console.log('Platform: Railway');
    }
    else if (exports.config.heroku.isHeroku) {
        console.log('Platform: Heroku');
    }
    else {
        console.log('Platform: Local/Unknown');
    }
    console.log('================================');
}
//# sourceMappingURL=index.js.map