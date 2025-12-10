import { Router, Response } from 'express';
import { schedulerService } from '../services/scheduler.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';

const router = Router();

router.get('/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use(authMiddleware);

router.get('/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schedulerStatus = schedulerService.getStatus();
    
    const [urlCount, activeUrls, totalExecutions, recentErrors] = await Promise.all([
      prisma.url.count({ where: { userId: req.userId } }),
      prisma.url.count({ where: { userId: req.userId, enabled: true } }),
      prisma.executionLog.count({ where: { userId: req.userId } }),
      prisma.executionLog.count({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const [executions, successRate] = await Promise.all([
      prisma.executionLog.findMany({
        where: {
          userId: req.userId,
          startedAt: { gte: last24Hours },
        },
        orderBy: { startedAt: 'desc' },
        take: 100,
      }),
      prisma.executionLog.groupBy({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const [logs, total] = await Promise.all([
      prisma.executionLog.findMany({
        where: { userId: req.userId },
        include: {
          url: { select: { label: true, url: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.executionLog.count({ where: { userId: req.userId } }),
    ]);

    res.json({ logs, total, limit, offset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
