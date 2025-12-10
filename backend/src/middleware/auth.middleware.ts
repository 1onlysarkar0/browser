import { Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../types';

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.token;
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : cookieToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await authService.validateSession(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};
