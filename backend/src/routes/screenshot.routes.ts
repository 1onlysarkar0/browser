import { Router, Request, Response } from 'express';
import { screenshotService } from '../services/screenshot.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await screenshotService.getAllForUser(req.userId!, limit, offset);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get screenshots';
    res.status(500).json({ error: message });
  }
});

router.get('/url/:urlId', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await screenshotService.findByUrlId(
      req.params.urlId,
      req.userId!,
      limit,
      offset
    );
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get screenshots';
    res.status(400).json({ error: message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const screenshot = await screenshotService.findById(req.params.id, req.userId!);
    res.json({ screenshot });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Screenshot not found';
    res.status(404).json({ error: message });
  }
});

router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const { filePath, fileName } = await screenshotService.getFile(req.params.id, req.userId!);
    res.download(filePath, fileName);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'File not found';
    res.status(404).json({ error: message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await screenshotService.delete(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete screenshot';
    res.status(400).json({ error: message });
  }
});

router.delete('/', async (req: Request, res: Response) => {
  try {
    const count = await screenshotService.deleteAll(req.userId!);
    res.json({ success: true, deleted: count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete screenshots';
    res.status(400).json({ error: message });
  }
});

export default router;
