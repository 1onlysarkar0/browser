"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_service_1 = require("../services/auth.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ error: 'Password must be at least 8 characters' });
            return;
        }
        const result = await auth_service_1.authService.register(email, password);
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user: result.user });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        res.status(400).json({ error: message });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }
        const result = await auth_service_1.authService.login(email, password);
        if ('requires2FA' in result) {
            res.json({ requires2FA: true, userId: result.userId });
            return;
        }
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user: result.user });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        res.status(401).json({ error: message });
    }
});
router.post('/2fa/verify', async (req, res) => {
    try {
        const { userId, code } = req.body;
        if (!userId || !code) {
            res.status(400).json({ error: 'User ID and code are required' });
            return;
        }
        const result = await auth_service_1.authService.verify2FA(userId, code);
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.json({ user: result.user });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '2FA verification failed';
        res.status(401).json({ error: message });
    }
});
router.post('/2fa/setup', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const result = await auth_service_1.authService.setup2FA(req.userId);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '2FA setup failed';
        res.status(400).json({ error: message });
    }
});
router.post('/2fa/enable', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: 'Verification code is required' });
            return;
        }
        const result = await auth_service_1.authService.enable2FA(req.userId, code);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '2FA enable failed';
        res.status(400).json({ error: message });
    }
});
router.post('/2fa/disable', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: 'Verification code is required' });
            return;
        }
        const result = await auth_service_1.authService.disable2FA(req.userId, code);
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '2FA disable failed';
        res.status(400).json({ error: message });
    }
});
router.get('/2fa/backup-codes', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const codes = await auth_service_1.authService.getBackupCodes(req.userId);
        res.json({ backupCodes: codes });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get backup codes';
        res.status(400).json({ error: message });
    }
});
router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies?.token || req.headers.authorization?.slice(7);
        if (token) {
            await auth_service_1.authService.logout(token);
        }
        res.clearCookie('token');
        res.json({ success: true });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Logout failed';
        res.status(400).json({ error: message });
    }
});
router.get('/me', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const user = await auth_service_1.authService.getUser(req.userId);
        res.json({ user });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get user';
        res.status(400).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map