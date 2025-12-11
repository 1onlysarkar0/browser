import { z } from "zod";

// URL entry for automation
export const urlSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().url(),
  isActive: z.boolean().default(true),
  intervalSeconds: z.number().default(300),
  speedMultiplier: z.number().default(1),
  captureScreenshots: z.boolean().default(true),
  lastExecutedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const insertUrlSchema = urlSchema.omit({ id: true, lastExecutedAt: true, createdAt: true });

export type Url = z.infer<typeof urlSchema>;
export type InsertUrl = z.infer<typeof insertUrlSchema>;

// Recorded action types
export const actionTypeSchema = z.enum(["click", "type", "scroll", "navigate", "wait", "hover"]);
export type ActionType = z.infer<typeof actionTypeSchema>;

// Single recorded action
export const actionSchema = z.object({
  id: z.number(),
  recordingId: z.number(),
  type: actionTypeSchema,
  selector: z.string().nullable(),
  value: z.string().nullable(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  scrollX: z.number().nullable(),
  scrollY: z.number().nullable(),
  timestamp: z.number(),
  order: z.number(),
});

export const insertActionSchema = actionSchema.omit({ id: true });

export type Action = z.infer<typeof actionSchema>;
export type InsertAction = z.infer<typeof insertActionSchema>;

// Recording session
export const recordingSchema = z.object({
  id: z.number(),
  urlId: z.number(),
  name: z.string(),
  actions: z.array(actionSchema).optional(),
  createdAt: z.string(),
});

export const insertRecordingSchema = recordingSchema.omit({ id: true, createdAt: true, actions: true });

export type Recording = z.infer<typeof recordingSchema>;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;

// Execution log
export const executionStatusSchema = z.enum(["pending", "running", "success", "failed"]);
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;

export const executionSchema = z.object({
  id: z.number(),
  urlId: z.number(),
  recordingId: z.number().nullable(),
  status: executionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  errorMessage: z.string().nullable(),
  actionsCompleted: z.number().default(0),
  totalActions: z.number().default(0),
});

export const insertExecutionSchema = executionSchema.omit({ id: true });

export type Execution = z.infer<typeof executionSchema>;
export type InsertExecution = z.infer<typeof insertExecutionSchema>;

// Screenshot
export const screenshotSchema = z.object({
  id: z.number(),
  executionId: z.number(),
  urlId: z.number(),
  filename: z.string(),
  filepath: z.string(),
  createdAt: z.string(),
});

export const insertScreenshotSchema = screenshotSchema.omit({ id: true, createdAt: true });

export type Screenshot = z.infer<typeof screenshotSchema>;
export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;

// System settings
export const settingsSchema = z.object({
  id: z.number(),
  chromiumPath: z.string().nullable(),
  autoCleanupScreenshots: z.boolean().default(false),
  screenshotRetentionDays: z.number().default(7),
  maxConcurrentBrowsers: z.number().default(2),
  defaultInterval: z.number().default(300),
});

export const updateSettingsSchema = settingsSchema.omit({ id: true }).partial();

export type Settings = z.infer<typeof settingsSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;

// System status for memory monitoring
export const systemStatusSchema = z.object({
  memoryUsageMB: z.number(),
  memoryLimitMB: z.number(),
  activeBrowsers: z.number(),
  scheduledTasks: z.number(),
  uptime: z.number(),
  chromiumPath: z.string().nullable(),
  chromiumDetected: z.boolean(),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;

// API response types
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

// For recordings with URL info
export type RecordingWithUrl = Recording & { urlName: string; urlAddress: string };

// For executions with URL info
export type ExecutionWithUrl = Execution & { urlName: string; urlAddress: string };

// For screenshots with URL info
export type ScreenshotWithUrl = Screenshot & { urlName: string };
