#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const backendDir = join(rootDir, 'backend');

console.log('\n🚀 Browser Automation Platform - Auto Setup\n');

function run(cmd, cwd = rootDir) {
  try {
    execSync(cmd, { stdio: 'inherit', cwd });
    return true;
  } catch {
    return false;
  }
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function findChromium() {
  const envPaths = [process.env.CHROMIUM_PATH, process.env.PUPPETEER_EXECUTABLE_PATH].filter(Boolean);
  for (const p of envPaths) {
    if (existsSync(p)) return p;
  }

  const systemPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser', 
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const p of systemPaths) {
    if (existsSync(p)) return p;
  }

  const which = runSilent('which chromium 2>/dev/null') || 
                runSilent('which chromium-browser 2>/dev/null') || 
                runSilent('which google-chrome 2>/dev/null');
  if (which) return which;

  try {
    if (existsSync('/nix/store')) {
      for (const entry of readdirSync('/nix/store')) {
        if (entry.includes('chromium')) {
          const binPath = join('/nix/store', entry, 'bin', 'chromium');
          if (existsSync(binPath)) return binPath;
        }
      }
    }
  } catch {}

  return null;
}

console.log('📦 Step 1/3: Chromium Setup');
if (process.env.PUPPETEER_SKIP_DOWNLOAD === 'true') {
  console.log('   ⏭️  Skipped (PUPPETEER_SKIP_DOWNLOAD=true)\n');
} else {
  const chromiumPath = findChromium();
  if (chromiumPath) {
    console.log(`   ✅ Found: ${chromiumPath}\n`);
  } else {
    console.log('   📥 Downloading Chromium via Puppeteer...');
    run('npx puppeteer browsers install chrome', backendDir);
    console.log('');
  }
}

console.log('🗄️  Step 2/3: Database Setup');
if (process.env.DATABASE_URL) {
  console.log('   📝 Generating Prisma client...');
  run('npx prisma generate', backendDir);
  console.log('   🔄 Syncing database schema...');
  if (run('npx prisma db push', backendDir)) {
    console.log('   ✅ Database ready\n');
  } else {
    console.log('   ⚠️  Will retry on first run\n');
  }
} else {
  console.log('   ⏭️  No DATABASE_URL - generating client only');
  run('npx prisma generate', backendDir);
  console.log('');
}

console.log('📁 Step 3/3: Directories');
const screenshotDir = process.env.SCREENSHOT_DIR || join(backendDir, 'screenshots');
if (!existsSync(screenshotDir)) {
  mkdirSync(screenshotDir, { recursive: true });
  console.log(`   ✅ Created: ${screenshotDir}\n`);
} else {
  console.log(`   ✅ Exists: ${screenshotDir}\n`);
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Setup complete!\n');
console.log('Commands:');
console.log('   npm run dev   → Development mode');
console.log('   npm run build → Build for production');
console.log('   npm start     → Production mode');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
