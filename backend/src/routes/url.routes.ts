import { Router, Response } from 'express';
import { urlService } from '../services/url.service';
import { schedulerService } from '../services/scheduler.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const urls = await urlService.findAll(req.userId!);
    res.json({ urls });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url, label, ...config } = req.body;
    
    if (!url || !label) {
      return res.status(400).json({ error: 'URL and label are required' });
    }

    const newUrl = await urlService.create(req.userId!, { url, label, ...config });
    res.status(201).json({ url: newUrl });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = await urlService.findById(req.params.id, req.userId!);
    
    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }

    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = await urlService.update(req.params.id, req.userId!, req.body);
    res.json({ url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await urlService.delete(req.params.id, req.userId!);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const url = await urlService.toggleStatus(req.params.id, req.userId!);
    res.json({ url });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await schedulerService.manualExecute(req.params.id, req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/screenshot', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await schedulerService.captureScreenshot(req.params.id, req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
