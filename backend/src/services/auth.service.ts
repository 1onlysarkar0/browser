import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { config } from '../config';
import logger from '../utils/logger';

export class AuthService {
  async register(email: string, password: string) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    const token = this.generateToken(user.id);
    await this.createSession(user.id, token);

    return { user: { id: user.id, email: user.email }, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
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

  async verify2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not configured');
    }

    const verified = speakeasy.totp.verify({
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
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: JSON.stringify(backupCodes) },
      });
    }

    const token = this.generateToken(userId);
    await this.createSession(userId, token);

    return { user: { id: user.id, email: user.email }, token };
  }

  async setup2FA(userId: string) {
    const secret = speakeasy.generateSecret({
      name: 'Browser Automation',
      length: 20,
    });

    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        backupCodes: JSON.stringify(backupCodes),
      },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    };
  }

  async enable2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not set up');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { success: true };
  }

  async disable2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not configured');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: null,
      },
    });

    return { success: true };
  }

  async getBackupCodes(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.backupCodes) {
      throw new Error('No backup codes available');
    }

    return JSON.parse(user.backupCodes);
  }

  async logout(token: string) {
    await prisma.session.deleteMany({ where: { token } });
    return { success: true };
  }

  async validateSession(token: string) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
      const session = await prisma.session.findFirst({
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
    } catch {
      return null;
    }
  }

  async getUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
    };
  }

  private generateToken(userId: string): string {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
  }

  private async createSession(userId: string, token: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }
}

export const authService = new AuthService();
