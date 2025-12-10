"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const url_service_1 = require("../services/url.service");
const scheduler_service_1 = require("../services/scheduler.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', async (req, res) => {
    try {
        const urls = await url_service_1.urlService.findAll(req.userId);
        res.json({ urls });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get URLs';
        res.status(500).json({ error: message });
    }
});
router.post('/', async (req, res) => {
    try {
        const { url, label, ...config } = req.body;
        if (!url || !label) {
            res.status(400).json({ error: 'URL and label are required' });
            return;
        }
        const newUrl = await url_service_1.urlService.create(req.userId, { url, label, ...config });
        res.status(201).json({ url: newUrl });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create URL';
        res.status(400).json({ error: message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const url = await url_service_1.urlService.findById(req.params.id, req.userId);
        if (!url) {
            res.status(404).json({ error: 'URL not found' });
            return;
        }
        res.json({ url });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get URL';
        res.status(500).json({ error: message });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const url = await url_service_1.urlService.update(req.params.id, req.userId, req.body);
        res.json({ url });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update URL';
        res.status(400).json({ error: message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await url_service_1.urlService.delete(req.params.id, req.userId);
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete URL';
        res.status(400).json({ error: message });
    }
});
router.patch('/:id/status', async (req, res) => {
    try {
        const url = await url_service_1.urlService.toggleStatus(req.params.id, req.userId);
        res.json({ url });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to toggle status';
        res.status(400).json({ error: message });
    }
});
router.post('/:id/run', async (req, res) => {
    try {
        const result = await scheduler_service_1.schedulerService.manualExecute(req.params.id, req.userId);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to run URL';
        res.status(400).json({ error: message });
    }
});
router.post('/:id/screenshot', async (req, res) => {
    try {
        const result = await scheduler_service_1.schedulerService.captureScreenshot(req.params.id, req.userId);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to capture screenshot';
        res.status(400).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=url.routes.js.map