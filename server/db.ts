import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || "./data";

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "autobrowser.db");

export const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    interval_seconds INTEGER DEFAULT 300,
    speed_multiplier REAL DEFAULT 1.0,
    capture_screenshots INTEGER DEFAULT 1,
    last_executed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recordings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    selector TEXT,
    value TEXT,
    x REAL,
    y REAL,
    scroll_x REAL,
    scroll_y REAL,
    timestamp INTEGER NOT NULL,
    action_order INTEGER NOT NULL,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url_id INTEGER NOT NULL,
    recording_id INTEGER,
    status TEXT DEFAULT 'pending',
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    error_message TEXT,
    actions_completed INTEGER DEFAULT 0,
    total_actions INTEGER DEFAULT 0,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
    FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS screenshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id INTEGER NOT NULL,
    url_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE,
    FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    chromium_path TEXT,
    auto_cleanup_screenshots INTEGER DEFAULT 0,
    screenshot_retention_days INTEGER DEFAULT 7,
    max_concurrent_browsers INTEGER DEFAULT 2,
    default_interval INTEGER DEFAULT 300
  );

  INSERT OR IGNORE INTO settings (id) VALUES (1);
`);

export function getSettings() {
  return db.prepare("SELECT * FROM settings WHERE id = 1").get() as {
    id: number;
    chromium_path: string | null;
    auto_cleanup_screenshots: number;
    screenshot_retention_days: number;
    max_concurrent_browsers: number;
    default_interval: number;
  };
}

export function updateSettings(data: Record<string, any>) {
  const fields: string[] = [];
  const values: any[] = [];
  
  if (data.chromiumPath !== undefined) {
    fields.push("chromium_path = ?");
    values.push(data.chromiumPath);
  }
  if (data.autoCleanupScreenshots !== undefined) {
    fields.push("auto_cleanup_screenshots = ?");
    values.push(data.autoCleanupScreenshots ? 1 : 0);
  }
  if (data.screenshotRetentionDays !== undefined) {
    fields.push("screenshot_retention_days = ?");
    values.push(data.screenshotRetentionDays);
  }
  if (data.maxConcurrentBrowsers !== undefined) {
    fields.push("max_concurrent_browsers = ?");
    values.push(data.maxConcurrentBrowsers);
  }
  if (data.defaultInterval !== undefined) {
    fields.push("default_interval = ?");
    values.push(data.defaultInterval);
  }
  
  if (fields.length > 0) {
    db.prepare(`UPDATE settings SET ${fields.join(", ")} WHERE id = 1`).run(...values);
  }
  return getSettings();
}

export default db;
