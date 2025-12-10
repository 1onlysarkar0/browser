"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const scheduler_service_1 = require("../services/scheduler.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
router.get('/health', async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.use(auth_middleware_1.authMiddleware);
router.get('/status', async (req, res) => {
    try {
        const schedulerStatus = scheduler_service_1.schedulerService.getStatus();
        const [urlCount, activeUrls, totalExecutions, recentErrors] = await Promise.all([
            prisma_1.default.url.count({ where: { userId: req.userId } }),
            prisma_1.default.url.count({ where: { userId: req.userId, enabled: true } }),
            prisma_1.default.executionLog.count({ where: { userId: req.userId } }),
            prisma_1.default.executionLog.count({
                where: {
                    userId: req.userId,
                    status: 'error',
                    startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                },
            }),
        ]);
        res.json({
            scheduler: schedulerStatus,
            stats: {
                totalUrls: urlCount,
                activeUrls,
                totalExecutions,
                recentErrors,
            },
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get status';
        res.status(500).json({ error: message });
    }
});
router.get('/metrics', async (req, res) => {
    try {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [executions, successRate] = await Promise.all([
            prisma_1.default.executionLog.findMany({
                where: {
                    userId: req.userId,
                    startedAt: { gte: last24Hours },
                },
                orderBy: { startedAt: 'desc' },
                take: 100,
            }),
            prisma_1.default.executionLog.groupBy({
                by: ['status'],
                where: {
                    userId: req.userId,
                    startedAt: { gte: last24Hours },
                },
                _count: true,
            }),
        ]);
        const total = successRate.reduce((acc, s) => acc + s._count, 0);
        const success = successRate.find(s => s.status === 'success')?._count || 0;
        const rate = total > 0 ? (success / total) * 100 : 0;
        res.json({
            recentExecutions: executions,
            successRate: rate.toFixed(2),
            totalExecutions24h: total,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get metrics';
        res.status(500).json({ error: message });
    }
});
router.get('/history', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const [logs, total] = await Promise.all([
            prisma_1.default.executionLog.findMany({
                where: { userId: req.userId },
                include: {
                    url: { select: { label: true, url: true } },
                },
                orderBy: { startedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma_1.default.executionLog.count({ where: { userId: req.userId } }),
        ]);
        res.json({ logs, total, limit, offset });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get history';
        res.status(500).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=system.routes.js.map