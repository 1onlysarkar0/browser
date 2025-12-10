import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await authService.register(email, password);
    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    
    if ('requires2FA' in result) {
      return res.json({ requires2FA: true, userId: result.userId });
    }

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and code are required' });
    }

    const result = await authService.verify2FA(userId, code);
    
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: result.user });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/2fa/setup', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await authService.setup2FA(req.userId!);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/2fa/enable', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await authService.enable2FA(req.userId!, code);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/2fa/disable', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const result = await authService.disable2FA(req.userId!, code);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/2fa/backup-codes', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const codes = await authService.getBackupCodes(req.userId!);
    res.json({ backupCodes: codes });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.slice(7);
    
    if (token) {
      await authService.logout(token);
    }

    res.clearCookie('token');
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authService.getUser(req.userId!);
    res.json({ user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
