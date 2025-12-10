"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const auth_service_1 = require("../services/auth.service");
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.token;
        const token = authHeader?.startsWith('Bearer ')
            ? authHeader.slice(7)
            : cookieToken;
        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const user = await auth_service_1.authService.validateSession(token);
        if (!user) {
            res.status(401).json({ error: 'Invalid or expired session' });
            return;
        }
        req.userId = user.id;
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.middleware.js.map