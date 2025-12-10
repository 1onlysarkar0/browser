import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

    const user = await authService.validateSession(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
    return;
  }
};
