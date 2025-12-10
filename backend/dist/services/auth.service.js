"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const config_1 = require("../config");
class AuthService {
    async register(email, password) {
        const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('User already exists');
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                passwordHash,
            },
        });
        const token = this.generateToken(user.id);
        await this.createSession(user.id, token);
        return { user: { id: user.id, email: user.email }, token };
    }
    async login(email, password) {
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }
        if (user.twoFactorEnabled) {
            return { requires2FA: true, userId: user.id };
        }
        const token = this.generateToken(user.id);
        await this.createSession(user.id, token);
        return { user: { id: user.id, email: user.email }, token };
    }
    async verify2FA(userId, code) {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new Error('2FA not configured');
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 2,
        });
        if (!verified) {
            const backupCodes = user.backupCodes ? JSON.parse(user.backupCodes) : [];
            const codeIndex = backupCodes.indexOf(code);
            if (codeIndex === -1) {
                throw new Error('Invalid 2FA code');
            }
            backupCodes.splice(codeIndex, 1);
            await prisma_1.default.user.update({
                where: { id: userId },
                data: { backupCodes: JSON.stringify(backupCodes) },
            });
        }
        const token = this.generateToken(userId);
        await this.createSession(userId, token);
        return { user: { id: user.id, email: user.email }, token };
    }
    async setup2FA(userId) {
        const secret = speakeasy_1.default.generateSecret({
            name: 'Browser Automation',
            length: 20,
        });
        const backupCodes = Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: secret.base32,
                backupCodes: JSON.stringify(backupCodes),
            },
        });
        const qrCodeUrl = await qrcode_1.default.toDataURL(secret.otpauth_url || '');
        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            backupCodes,
        };
    }
    async enable2FA(userId, code) {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new Error('2FA not set up');
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 2,
        });
        if (!verified) {
            throw new Error('Invalid verification code');
        }
        await prisma_1.default.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });
        return { success: true };
    }
    async disable2FA(userId, code) {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.twoFactorSecret) {
            throw new Error('2FA not configured');
        }
        const verified = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 2,
        });
        if (!verified) {
            throw new Error('Invalid verification code');
        }
        await prisma_1.default.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                backupCodes: null,
            },
        });
        return { success: true };
    }
    async getBackupCodes(userId) {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user || !user.backupCodes) {
            throw new Error('No backup codes available');
        }
        return JSON.parse(user.backupCodes);
    }
    async logout(token) {
        await prisma_1.default.session.deleteMany({ where: { token } });
        return { success: true };
    }
    async validateSession(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            const session = await prisma_1.default.session.findFirst({
                where: {
                    token,
                    userId: decoded.userId,
                    expiresAt: { gt: new Date() },
                },
                include: { user: true },
            });
            if (!session) {
                return null;
            }
            return { id: session.user.id, email: session.user.email };
        }
        catch {
            return null;
        }
    }
    async getUser(userId) {
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return null;
        return {
            id: user.id,
            email: user.email,
            twoFactorEnabled: user.twoFactorEnabled,
            createdAt: user.createdAt,
        };
    }
    generateToken(userId) {
        return jsonwebtoken_1.default.sign({ userId }, config_1.config.jwtSecret, { expiresIn: '7d' });
    }
    async createSession(userId, token) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma_1.default.session.create({
            data: {
                userId,
                token,
                expiresAt,
            },
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map