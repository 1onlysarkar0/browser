import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  detectChromiumPath,
  testChromium,
  getActiveBrowsers,
  getScheduledTasksCount,
  scheduleUrl,
  unscheduleUrl,
  captureManualScreenshot,
  initializeScheduler,
  capturePageScreenshot,
  startSession,
  closeSession,
  executeSessionAction,
  getSessionScreenshot,
  hasActiveSession,
} from "./automation";
import { insertUrlSchema } from "@shared/schema";
import path from "path";
import fs from "fs";
import {
  broadcastStatus,
  broadcastExecutions,
  broadcastScreenshots,
  broadcastUrls,
  broadcastRecordings,
} from "./websocket";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  initializeScheduler();

  app.get("/api/status", async (req, res) => {
    try {
      const settings = storage.getSettings();
      const chromiumPath = settings.chromiumPath || (await detectChromiumPath());
      const memUsage = process.memoryUsage();
      
      res.json({
        memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryLimitMB: 512,
        activeBrowsers: getActiveBrowsers(),
        scheduledTasks: getScheduledTasksCount(),
        uptime: Math.floor(process.uptime()),
        chromiumPath,
        chromiumDetected: !!chromiumPath,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/urls", (req, res) => {
    try {
      const urls = storage.getUrls();
      res.json(urls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/urls/:id", (req, res) => {
    try {
      const url = storage.getUrl(parseInt(req.params.id));
      if (!url) {
        return res.status(404).json({ error: "URL not found" });
      }
      res.json(url);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/urls", (req, res) => {
    try {
      const parsed = insertUrlSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.message });
      }
      const url = storage.createUrl(parsed.data);
      
      if (url.isActive) {
        scheduleUrl(url);
      }
      
      res.json(url);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/urls/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const url = storage.updateUrl(id, req.body);
      if (!url) {
        return res.status(404).json({ error: "URL not found" });
      }
      
      if (req.body.isActive !== undefined) {
        if (req.body.isActive) {
          scheduleUrl(url);
        } else {
          unscheduleUrl(id);
        }
      }
      
      res.json(url);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/urls/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      unscheduleUrl(id);
      const deleted = storage.deleteUrl(id);
      if (!deleted) {
        return res.status(404).json({ error: "URL not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recordings", (req, res) => {
    try {
      const urlId = req.query.urlId ? parseInt(req.query.urlId as string) : undefined;
      const recordings = storage.getRecordings(urlId);
      res.json(recordings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recordings/:id", (req, res) => {
    try {
      const recording = storage.getRecording(parseInt(req.params.id));
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      const actions = storage.getActions(recording.id);
      res.json({ ...recording, actions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/recordings/:id/actions", (req, res) => {
    try {
      const recording = storage.getRecording(parseInt(req.params.id));
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }
      const actions = storage.getActions(recording.id);
      res.json(actions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/recordings", (req, res) => {
    try {
      const { urlId, name, actions } = req.body;
      if (!urlId || !name || !actions) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const url = storage.getUrl(urlId);
      if (!url) {
        return res.status(404).json({ error: "URL not found" });
      }

      const recording = storage.createRecording(
        { urlId, name },
        actions.map((a: any, index: number) => ({
          type: a.type,
          selector: a.selector,
          value: a.value,
          x: a.x,
          y: a.y,
          scrollX: a.scrollX,
          scrollY: a.scrollY,
          timestamp: a.timestamp,
          order: index,
        }))
      );

      scheduleUrl(url);
      
      res.json(recording);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/recordings/:id", (req, res) => {
    try {
      const deleted = storage.deleteRecording(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ error: "Recording not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Recording editing - update a recording
  app.put("/api/recordings/:id", (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, actions } = req.body;
      
      const recording = storage.getRecording(id);
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const updated = storage.updateRecording(id, name, actions);
      if (!updated) {
        return res.status(500).json({ error: "Failed to update recording" });
      }

      // Reschedule the URL to use updated recording
      const url = storage.getUrl(recording.urlId);
      if (url && url.isActive) {
        scheduleUrl(url);
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Live Session API for Recording ============

  // Start a live browser session for recording
  app.post("/api/session/:urlId/start", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      const result = await startSession(urlId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, screenshot: result.screenshot });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Close a live browser session
  app.post("/api/session/:urlId/close", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      const result = await closeSession(urlId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Execute an action in the live session
  app.post("/api/session/:urlId/execute", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      const action = req.body;
      const result = await executeSessionAction(urlId, action);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, screenshot: result.screenshot });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get current session screenshot
  app.get("/api/session/:urlId/screenshot", async (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      const result = await getSessionScreenshot(urlId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, screenshot: result.screenshot });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Check if session is active
  app.get("/api/session/:urlId/status", (req, res) => {
    try {
      const urlId = parseInt(req.params.urlId);
      const active = hasActiveSession(urlId);
      res.json({ active });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/executions", (req, res) => {
    try {
      const urlId = req.query.urlId ? parseInt(req.query.urlId as string) : undefined;
      const executions = storage.getExecutions(urlId);
      res.json(executions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/executions", (req, res) => {
    try {
      storage.deleteAllExecutions();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/screenshots", (req, res) => {
    try {
      const urlId = req.query.urlId ? parseInt(req.query.urlId as string) : undefined;
      const screenshots = storage.getScreenshots(urlId);
      res.json(screenshots);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/screenshots/:id/image", (req, res) => {
    try {
      const screenshot = storage.getScreenshot(parseInt(req.params.id));
      if (!screenshot) {
        return res.status(404).json({ error: "Screenshot not found" });
      }
      if (!fs.existsSync(screenshot.filepath)) {
        return res.status(404).json({ error: "Screenshot file not found" });
      }
      res.sendFile(path.resolve(screenshot.filepath));
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/screenshots/:id", (req, res) => {
    try {
      const deleted = storage.deleteScreenshot(parseInt(req.params.id));
      if (!deleted) {
        return res.status(404).json({ error: "Screenshot not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/screenshots", (req, res) => {
    try {
      storage.deleteAllScreenshots();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/screenshots/capture/:urlId", async (req, res) => {
    try {
      const result = await captureManualScreenshot(parseInt(req.params.urlId));
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.json({ success: true, path: result.path });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings", (req, res) => {
    try {
      const settings = storage.getSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/settings", (req, res) => {
    try {
      const settings = storage.updateSettings(req.body);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings/test-chromium", async (req, res) => {
    try {
      const { path: chromiumPath } = req.body;
      const result = await testChromium(chromiumPath);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      res.json({ success: true, message: result.message });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/settings/detect-chromium", async (req, res) => {
    try {
      const detectedPath = await detectChromiumPath();
      res.json({ path: detectedPath });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/preview", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "URL parameter required" });
      }

      try {
        new URL(targetUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }

      const result = await capturePageScreenshot(targetUrl);
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({ 
        success: true, 
        image: `data:image/png;base64,${result.data}`,
        timestamp: Date.now()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  setInterval(async () => {
    try {
      const settings = storage.getSettings();
      const chromiumPath = settings.chromiumPath || (await detectChromiumPath());
      const memUsage = process.memoryUsage();
      
      broadcastStatus({
        memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryLimitMB: 512,
        activeBrowsers: getActiveBrowsers(),
        scheduledTasks: getScheduledTasksCount(),
        uptime: Math.floor(process.uptime()),
        chromiumPath,
        chromiumDetected: !!chromiumPath,
      });

      broadcastExecutions(storage.getExecutions());
      broadcastScreenshots(storage.getScreenshots());
    } catch (error) {
      console.error("Broadcast error:", error);
    }
  }, 1000);

  return httpServer;
}
