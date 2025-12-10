"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const screenshot_service_1 = require("../services/screenshot.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = await screenshot_service_1.screenshotService.getAllForUser(req.userId, limit, offset);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get screenshots';
        res.status(500).json({ error: message });
    }
});
router.get('/url/:urlId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = await screenshot_service_1.screenshotService.findByUrlId(req.params.urlId, req.userId, limit, offset);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get screenshots';
        res.status(400).json({ error: message });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const screenshot = await screenshot_service_1.screenshotService.findById(req.params.id, req.userId);
        res.json({ screenshot });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Screenshot not found';
        res.status(404).json({ error: message });
    }
});
router.get('/:id/file', async (req, res) => {
    try {
        const { filePath, fileName } = await screenshot_service_1.screenshotService.getFile(req.params.id, req.userId);
        res.download(filePath, fileName);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'File not found';
        res.status(404).json({ error: message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        await screenshot_service_1.screenshotService.delete(req.params.id, req.userId);
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete screenshot';
        res.status(400).json({ error: message });
    }
});
router.delete('/', async (req, res) => {
    try {
        const count = await screenshot_service_1.screenshotService.deleteAll(req.userId);
        res.json({ success: true, deleted: count });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete screenshots';
        res.status(400).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=screenshot.routes.js.map