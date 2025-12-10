import { Router, Request, Response } from 'express';
import { urlService } from '../services/url.service';
import { schedulerService } from '../services/scheduler.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const urls = await urlService.findAll(req.userId!);
    res.json({ urls });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get URLs';
    res.status(500).json({ error: message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { url, label, ...config } = req.body;
    
    if (!url || !label) {
      res.status(400).json({ error: 'URL and label are required' });
      return;
    }

    const newUrl = await urlService.create(req.userId!, { url, label, ...config });
    res.status(201).json({ url: newUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create URL';
    res.status(400).json({ error: message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const url = await urlService.findById(req.params.id, req.userId!);
    
    if (!url) {
      res.status(404).json({ error: 'URL not found' });
      return;
    }

    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get URL';
    res.status(500).json({ error: message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const url = await urlService.update(req.params.id, req.userId!, req.body);
    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update URL';
    res.status(400).json({ error: message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await urlService.delete(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete URL';
    res.status(400).json({ error: message });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const url = await urlService.toggleStatus(req.params.id, req.userId!);
    res.json({ url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to toggle status';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.manualExecute(req.params.id, req.userId!);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run URL';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/screenshot', async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.captureScreenshot(req.params.id, req.userId!);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to capture screenshot';
    res.status(400).json({ error: message });
  }
});

export default router;
