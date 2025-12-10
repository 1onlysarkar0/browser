import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiry: '7d',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',
  nodeEnv: process.env.NODE_ENV || 'development',
};
