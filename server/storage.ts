import fs from "fs";
import { db, getSettings, updateSettings } from "./db";
import type {
  Url,
  InsertUrl,
  Recording,
  InsertRecording,
  Action,
  InsertAction,
  Execution,
  InsertExecution,
  Screenshot,
  InsertScreenshot,
  Settings,
  UpdateSettings,
  RecordingWithUrl,
  ExecutionWithUrl,
  ScreenshotWithUrl,
} from "@shared/schema";

function rowToUrl(row: any): Url {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    isActive: Boolean(row.is_active),
    intervalSeconds: row.interval_seconds,
    speedMultiplier: row.speed_multiplier,
    captureScreenshots: Boolean(row.capture_screenshots),
    lastExecutedAt: row.last_executed_at,
    createdAt: row.created_at,
  };
}

function rowToRecording(row: any): Recording {
  return {
    id: row.id,
    urlId: row.url_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

function rowToAction(row: any): Action {
  return {
    id: row.id,
    recordingId: row.recording_id,
    type: row.type,
    selector: row.selector,
    value: row.value,
    x: row.x,
    y: row.y,
    scrollX: row.scroll_x,
    scrollY: row.scroll_y,
    timestamp: row.timestamp,
    order: row.action_order,
  };
}

function rowToExecution(row: any): Execution {
  return {
    id: row.id,
    urlId: row.url_id,
    recordingId: row.recording_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    actionsCompleted: row.actions_completed,
    totalActions: row.total_actions,
  };
}

function rowToScreenshot(row: any): Screenshot {
  return {
    id: row.id,
    executionId: row.execution_id,
    urlId: row.url_id,
    filename: row.filename,
    filepath: row.filepath,
    createdAt: row.created_at,
  };
}

function rowToSettings(row: any): Settings {
  return {
    id: row.id,
    chromiumPath: row.chromium_path,
    autoCleanupScreenshots: Boolean(row.auto_cleanup_screenshots),
    screenshotRetentionDays: row.screenshot_retention_days,
    maxConcurrentBrowsers: row.max_concurrent_browsers,
    defaultInterval: row.default_interval,
  };
}

export interface IStorage {
  getUrls(): Url[];
  getUrl(id: number): Url | undefined;
  createUrl(data: InsertUrl): Url;
  updateUrl(id: number, data: Partial<InsertUrl>): Url | undefined;
  deleteUrl(id: number): boolean;
  
  getRecordings(urlId?: number): RecordingWithUrl[];
  getRecording(id: number): Recording | undefined;
  createRecording(data: InsertRecording, actions: Omit<InsertAction, "recordingId">[]): Recording;
  updateRecording(id: number, name: string, actions: Omit<InsertAction, "recordingId">[]): Recording | undefined;
  deleteRecording(id: number): boolean;
  
  getActions(recordingId: number): Action[];
  
  getExecutions(urlId?: number): ExecutionWithUrl[];
  getExecution(id: number): Execution | undefined;
  createExecution(data: Omit<InsertExecution, "id">): Execution;
  updateExecution(id: number, data: Partial<Execution>): Execution | undefined;
  deleteAllExecutions(): boolean;
  
  getScreenshots(urlId?: number): ScreenshotWithUrl[];
  getScreenshot(id: number): Screenshot | undefined;
  createScreenshot(data: Omit<InsertScreenshot, "id">): Screenshot;
  deleteScreenshot(id: number): boolean;
  deleteAllScreenshots(): boolean;
  
  getSettings(): Settings;
  updateSettings(data: UpdateSettings): Settings;
}

export class SQLiteStorage implements IStorage {
  getUrls(): Url[] {
    const rows = db.prepare("SELECT * FROM urls ORDER BY created_at DESC").all();
    return rows.map(rowToUrl);
  }

  getUrl(id: number): Url | undefined {
    const row = db.prepare("SELECT * FROM urls WHERE id = ?").get(id);
    return row ? rowToUrl(row) : undefined;
  }

  createUrl(data: InsertUrl): Url {
    const result = db.prepare(`
      INSERT INTO urls (name, url, is_active, interval_seconds, speed_multiplier, capture_screenshots)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      data.url,
      data.isActive ? 1 : 0,
      data.intervalSeconds,
      data.speedMultiplier,
      data.captureScreenshots ? 1 : 0
    );
    return this.getUrl(result.lastInsertRowid as number)!;
  }

  updateUrl(id: number, data: Partial<InsertUrl>): Url | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name); }
    if (data.url !== undefined) { fields.push("url = ?"); values.push(data.url); }
    if (data.isActive !== undefined) { fields.push("is_active = ?"); values.push(data.isActive ? 1 : 0); }
    if (data.intervalSeconds !== undefined) { fields.push("interval_seconds = ?"); values.push(data.intervalSeconds); }
    if (data.speedMultiplier !== undefined) { fields.push("speed_multiplier = ?"); values.push(data.speedMultiplier); }
    if (data.captureScreenshots !== undefined) { fields.push("capture_screenshots = ?"); values.push(data.captureScreenshots ? 1 : 0); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE urls SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.getUrl(id);
  }

  deleteUrl(id: number): boolean {
    const result = db.prepare("DELETE FROM urls WHERE id = ?").run(id);
    return result.changes > 0;
  }

  getRecordings(urlId?: number): RecordingWithUrl[] {
    const query = urlId
      ? `SELECT r.*, u.name as url_name, u.url as url_address FROM recordings r JOIN urls u ON r.url_id = u.id WHERE r.url_id = ? ORDER BY r.created_at DESC`
      : `SELECT r.*, u.name as url_name, u.url as url_address FROM recordings r JOIN urls u ON r.url_id = u.id ORDER BY r.created_at DESC`;
    
    const rows = urlId ? db.prepare(query).all(urlId) : db.prepare(query).all();
    return rows.map((row: any) => ({
      ...rowToRecording(row),
      urlName: row.url_name,
      urlAddress: row.url_address,
    }));
  }

  getRecording(id: number): Recording | undefined {
    const row = db.prepare("SELECT * FROM recordings WHERE id = ?").get(id);
    return row ? rowToRecording(row) : undefined;
  }

  createRecording(data: InsertRecording, actions: Omit<InsertAction, "recordingId">[]): Recording {
    const result = db.prepare(`
      INSERT INTO recordings (url_id, name) VALUES (?, ?)
    `).run(data.urlId, data.name);

    const recordingId = result.lastInsertRowid as number;

    const insertAction = db.prepare(`
      INSERT INTO actions (recording_id, type, selector, value, x, y, scroll_x, scroll_y, timestamp, action_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const action of actions) {
      insertAction.run(
        recordingId,
        action.type,
        action.selector,
        action.value,
        action.x,
        action.y,
        action.scrollX,
        action.scrollY,
        action.timestamp,
        action.order
      );
    }

    return this.getRecording(recordingId)!;
  }

  deleteRecording(id: number): boolean {
    const result = db.prepare("DELETE FROM recordings WHERE id = ?").run(id);
    return result.changes > 0;
  }

  updateRecording(id: number, name: string, actions: Omit<InsertAction, "recordingId">[]): Recording | undefined {
    const recording = this.getRecording(id);
    if (!recording) return undefined;

    // Update recording name
    db.prepare("UPDATE recordings SET name = ? WHERE id = ?").run(name, id);

    // Delete old actions
    db.prepare("DELETE FROM actions WHERE recording_id = ?").run(id);

    // Insert new actions
    const insertAction = db.prepare(`
      INSERT INTO actions (recording_id, type, selector, value, x, y, scroll_x, scroll_y, timestamp, action_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      insertAction.run(
        id,
        action.type,
        action.selector,
        action.value,
        action.x,
        action.y,
        action.scrollX,
        action.scrollY,
        action.timestamp,
        action.order ?? i
      );
    }

    return this.getRecording(id);
  }

  getActions(recordingId: number): Action[] {
    const rows = db.prepare("SELECT * FROM actions WHERE recording_id = ? ORDER BY action_order").all(recordingId);
    return rows.map(rowToAction);
  }

  getExecutions(urlId?: number): ExecutionWithUrl[] {
    const query = urlId
      ? `SELECT e.*, u.name as url_name, u.url as url_address FROM executions e JOIN urls u ON e.url_id = u.id WHERE e.url_id = ? ORDER BY e.started_at DESC`
      : `SELECT e.*, u.name as url_name, u.url as url_address FROM executions e JOIN urls u ON e.url_id = u.id ORDER BY e.started_at DESC`;
    
    const rows = urlId ? db.prepare(query).all(urlId) : db.prepare(query).all();
    return rows.map((row: any) => ({
      ...rowToExecution(row),
      urlName: row.url_name,
      urlAddress: row.url_address,
    }));
  }

  getExecution(id: number): Execution | undefined {
    const row = db.prepare("SELECT * FROM executions WHERE id = ?").get(id);
    return row ? rowToExecution(row) : undefined;
  }

  createExecution(data: Omit<InsertExecution, "id">): Execution {
    const result = db.prepare(`
      INSERT INTO executions (url_id, recording_id, status, started_at, completed_at, error_message, actions_completed, total_actions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.urlId,
      data.recordingId,
      data.status,
      data.startedAt,
      data.completedAt,
      data.errorMessage,
      data.actionsCompleted,
      data.totalActions
    );
    return this.getExecution(result.lastInsertRowid as number)!;
  }

  updateExecution(id: number, data: Partial<Execution>): Execution | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
    if (data.completedAt !== undefined) { fields.push("completed_at = ?"); values.push(data.completedAt); }
    if (data.errorMessage !== undefined) { fields.push("error_message = ?"); values.push(data.errorMessage); }
    if (data.actionsCompleted !== undefined) { fields.push("actions_completed = ?"); values.push(data.actionsCompleted); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE executions SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }
    return this.getExecution(id);
  }

  deleteAllExecutions(): boolean {
    db.prepare("DELETE FROM executions").run();
    return true;
  }

  getScreenshots(urlId?: number): ScreenshotWithUrl[] {
    const query = urlId
      ? `SELECT s.*, u.name as url_name FROM screenshots s JOIN urls u ON s.url_id = u.id WHERE s.url_id = ? ORDER BY s.created_at DESC`
      : `SELECT s.*, u.name as url_name FROM screenshots s JOIN urls u ON s.url_id = u.id ORDER BY s.created_at DESC`;
    
    const rows = urlId ? db.prepare(query).all(urlId) : db.prepare(query).all();
    return rows.map((row: any) => ({
      ...rowToScreenshot(row),
      urlName: row.url_name,
    }));
  }

  getScreenshot(id: number): Screenshot | undefined {
    const row = db.prepare("SELECT * FROM screenshots WHERE id = ?").get(id);
    return row ? rowToScreenshot(row) : undefined;
  }

  createScreenshot(data: Omit<InsertScreenshot, "id">): Screenshot {
    const result = db.prepare(`
      INSERT INTO screenshots (execution_id, url_id, filename, filepath)
      VALUES (?, ?, ?, ?)
    `).run(data.executionId, data.urlId, data.filename, data.filepath);
    return this.getScreenshot(result.lastInsertRowid as number)!;
  }

  deleteScreenshot(id: number): boolean {
    const screenshot = this.getScreenshot(id);
    if (screenshot) {
      try {
        if (fs.existsSync(screenshot.filepath)) {
          fs.unlinkSync(screenshot.filepath);
        }
      } catch (e) {}
    }
    const result = db.prepare("DELETE FROM screenshots WHERE id = ?").run(id);
    return result.changes > 0;
  }

  deleteAllScreenshots(): boolean {
    const screenshots = this.getScreenshots();
    for (const ss of screenshots) {
      try {
        if (fs.existsSync(ss.filepath)) {
          fs.unlinkSync(ss.filepath);
        }
      } catch (e) {}
    }
    db.prepare("DELETE FROM screenshots").run();
    return true;
  }

  getSettings(): Settings {
    return rowToSettings(getSettings());
  }

  updateSettings(data: UpdateSettings): Settings {
    return rowToSettings(updateSettings(data));
  }
}

export const storage = new SQLiteStorage();
