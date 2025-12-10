"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = exports.emitScreenshotCaptured = exports.emitExecutionComplete = exports.emitExecutionStart = exports.emitUrlUpdate = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const config_1 = require("./config");
const logger_1 = __importDefault(require("./utils/logger"));
const scheduler_service_1 = require("./services/scheduler.service");
const chromium_1 = require("./utils/chromium");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const url_routes_1 = __importDefault(require("./routes/url.routes"));
const screenshot_routes_1 = __importDefault(require("./routes/screenshot.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
const corsOptions = {
    origin: config_1.config.corsOrigins.length > 0 ? config_1.config.corsOrigins : true,
    credentials: true,
};
const io = new socket_io_1.Server(httpServer, {
    cors: corsOptions,
});
exports.io = io;
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use('/screenshots', express_1.default.static(config_1.config.screenshotDir));
app.use('/api/auth', auth_routes_1.default);
app.use('/api/urls', url_routes_1.default);
app.use('/api/screenshots', screenshot_routes_1.default);
app.use('/api/system', system_routes_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config_1.config.nodeEnv,
    });
});
app.get('/api/browser-status', (req, res) => {
    const browserStatus = (0, chromium_1.validateChromiumSetup)();
    res.json({
        browser: browserStatus,
        timestamp: new Date().toISOString(),
    });
});
io.on('connection', (socket) => {
    logger_1.default.info(`WebSocket client connected: ${socket.id}`);
    socket.on('subscribe:url', (urlId) => {
        socket.join(`url:${urlId}`);
    });
    socket.on('unsubscribe:url', (urlId) => {
        socket.leave(`url:${urlId}`);
    });
    socket.on('disconnect', () => {
        logger_1.default.info(`WebSocket client disconnected: ${socket.id}`);
    });
});
const emitUrlUpdate = (urlId, data) => {
    io.to(`url:${urlId}`).emit('url:status-update', data);
};
exports.emitUrlUpdate = emitUrlUpdate;
const emitExecutionStart = (urlId, data) => {
    io.to(`url:${urlId}`).emit('url:execution-start', data);
};
exports.emitExecutionStart = emitExecutionStart;
const emitExecutionComplete = (urlId, data) => {
    io.to(`url:${urlId}`).emit('url:execution-complete', data);
};
exports.emitExecutionComplete = emitExecutionComplete;
const emitScreenshotCaptured = (urlId, data) => {
    io.to(`url:${urlId}`).emit('screenshot:captured', data);
};
exports.emitScreenshotCaptured = emitScreenshotCaptured;
const PORT = config_1.config.port;
httpServer.listen(PORT, '0.0.0.0', () => {
    (0, config_1.logConfig)();
    logger_1.default.info(`Server running on port ${PORT}`);
    const browserStatus = (0, chromium_1.validateChromiumSetup)();
    if (browserStatus.valid) {
        logger_1.default.info(`Chromium available at: ${browserStatus.path}`);
    }
    else {
        logger_1.default.warn(`Chromium not available: ${browserStatus.error}`);
    }
    scheduler_service_1.schedulerService.start();
    logger_1.default.info('Automation scheduler started');
});
process.on('SIGTERM', async () => {
    logger_1.default.info('SIGTERM received, shutting down gracefully');
    scheduler_service_1.schedulerService.stop();
    httpServer.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    logger_1.default.info('SIGINT received, shutting down gracefully');
    scheduler_service_1.schedulerService.stop();
    httpServer.close(() => {
        logger_1.default.info('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=app.js.map