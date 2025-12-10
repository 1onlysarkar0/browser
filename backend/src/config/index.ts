import dotenv from 'dotenv';
dotenv.config();

function getPort(): number {
  if (process.env.PORT) {
    return parseInt(process.env.PORT, 10);
  }
  
  if (process.env.RENDER || process.env.RENDER_SERVICE_ID) {
    return parseInt(process.env.PORT || '10000', 10);
  }
  
  if (process.env.RAILWAY_ENVIRONMENT) {
    return parseInt(process.env.PORT || '3000', 10);
  }
  
  if (process.env.DYNO) {
    return parseInt(process.env.PORT || '3000', 10);
  }
  
  return 3001;
}

function getFrontendUrl(): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  if (process.env.RENDER_EXTERNAL_URL) {
    const backendUrl = process.env.RENDER_EXTERNAL_URL;
    return backendUrl.replace('-api', '').replace('api-', '');
  }
  
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  
  return 'http://localhost:5000';
}

function getDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  if (process.env.DATABASE_PRIVATE_URL) {
    return process.env.DATABASE_PRIVATE_URL;
  }
  
  if (process.env.POSTGRES_URL) {
    return process.env.POSTGRES_URL;
  }
  
  return undefined;
}

function getRedisUrl(): string {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  
  if (process.env.REDIS_PRIVATE_URL) {
    return process.env.REDIS_PRIVATE_URL;
  }
  
  if (process.env.REDISCLOUD_URL) {
    return process.env.REDISCLOUD_URL;
  }
  
  return 'redis://localhost:6379';
}

function getEnvironment(): string {
  if (process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  
  if (process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.DYNO) {
    return 'production';
  }
  
  return 'development';
}

function getCorsOrigins(): string[] {
  const origins: string[] = [];
  
  if (process.env.CORS_ORIGINS) {
    origins.push(...process.env.CORS_ORIGINS.split(',').map(o => o.trim()));
  }
  
  const frontendUrl = getFrontendUrl();
  if (frontendUrl && !origins.includes(frontendUrl)) {
    origins.push(frontendUrl);
  }
  
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    origins.push(`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
  }
  
  if (getEnvironment() === 'development') {
    origins.push('http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000');
  }
  
  return [...new Set(origins)];
}

export const config = {
  port: getPort(),
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  databaseUrl: getDatabaseUrl(),
  redisUrl: getRedisUrl(),
  screenshotDir: process.env.SCREENSHOT_DIR || './screenshots',
  frontendUrl: getFrontendUrl(),
  nodeEnv: getEnvironment(),
  corsOrigins: getCorsOrigins(),
  isProduction: getEnvironment() === 'production',
  
  render: {
    isRender: !!(process.env.RENDER || process.env.RENDER_SERVICE_ID),
    externalUrl: process.env.RENDER_EXTERNAL_URL,
    hostname: process.env.RENDER_EXTERNAL_HOSTNAME,
  },
  
  railway: {
    isRailway: !!process.env.RAILWAY_ENVIRONMENT,
    publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
  },
  
  heroku: {
    isHeroku: !!process.env.DYNO,
    appName: process.env.HEROKU_APP_NAME,
  },
};

export function logConfig(): void {
  console.log('=== Application Configuration ===');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Port: ${config.port}`);
  console.log(`Frontend URL: ${config.frontendUrl}`);
  console.log(`Database: ${config.databaseUrl ? 'Configured' : 'Not configured'}`);
  console.log(`Redis: ${config.redisUrl}`);
  console.log(`CORS Origins: ${config.corsOrigins.join(', ')}`);
  
  if (config.render.isRender) {
    console.log('Platform: Render');
    console.log(`External URL: ${config.render.externalUrl}`);
  } else if (config.railway.isRailway) {
    console.log('Platform: Railway');
  } else if (config.heroku.isHeroku) {
    console.log('Platform: Heroku');
  } else {
    console.log('Platform: Local/Unknown');
  }
  console.log('================================');
}
