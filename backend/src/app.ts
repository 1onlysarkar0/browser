import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config, logConfig } from './config';
import logger from './utils/logger';
import { schedulerService } from './services/scheduler.service';
import { validateChromiumSetup } from './utils/chromium';

import authRoutes from './routes/auth.routes';
import urlRoutes from './routes/url.routes';
import screenshotRoutes from './routes/screenshot.routes';
import systemRoutes from './routes/system.routes';

const app = express();
const httpServer = createServer(app);

const corsOptions = {
  origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
  credentials: true,
};

const io = new Server(httpServer, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use('/screenshots', express.static(config.screenshotDir));

app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);
app.use('/api/screenshots', screenshotRoutes);
app.use('/api/system', systemRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get('/api/browser-status', (req: Request, res: Response) => {
  const browserStatus = validateChromiumSetup();
  res.json({ 
    browser: browserStatus,
    timestamp: new Date().toISOString(),
  });
});

io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  socket.on('subscribe:url', (urlId: string) => {
    socket.join(`url:${urlId}`);
  });

  socket.on('unsubscribe:url', (urlId: string) => {
    socket.leave(`url:${urlId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });
});

export const emitUrlUpdate = (urlId: string, data: any) => {
  io.to(`url:${urlId}`).emit('url:status-update', data);
};

export const emitExecutionStart = (urlId: string, data: any) => {
  io.to(`url:${urlId}`).emit('url:execution-start', data);
};

export const emitExecutionComplete = (urlId: string, data: any) => {
  io.to(`url:${urlId}`).emit('url:execution-complete', data);
};

export const emitScreenshotCaptured = (urlId: string, data: any) => {
  io.to(`url:${urlId}`).emit('screenshot:captured', data);
};

const PORT = config.port;

httpServer.listen(PORT, '0.0.0.0', () => {
  logConfig();
  logger.info(`Server running on port ${PORT}`);
  
  const browserStatus = validateChromiumSetup();
  if (browserStatus.valid) {
    logger.info(`Chromium available at: ${browserStatus.path}`);
  } else {
    logger.warn(`Chromium not available: ${browserStatus.error}`);
  }
  
  schedulerService.start();
  logger.info('Automation scheduler started');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  schedulerService.stop();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  schedulerService.stop();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, io };
