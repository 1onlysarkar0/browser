import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface InteractionStep {
  type: 'navigate' | 'click' | 'doubleClick' | 'rightClick' | 'fill' | 'type' | 'press' | 'selectOption' | 'check' | 'uncheck' | 'scroll' | 'scrollToElement' | 'scrollToBottom' | 'scrollToTop' | 'waitForSelector' | 'waitForNavigation' | 'waitForTime' | 'screenshot' | 'getElementText' | 'getAttribute' | 'evaluateJs' | 'goBack' | 'goForward' | 'reload' | 'hover' | 'dragAndDrop';
  selector?: string;
  targetSelector?: string;
  value?: string;
  timeout?: number;
  xOffset?: number;
  yOffset?: number;
  code?: string;
  attribute?: string;
  delay?: number;
}

export interface UrlConfig {
  id: string;
  url: string;
  label: string;
  enabled: boolean;
  description?: string;
  runIntervalSeconds: number;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  timezone: string;
  repeatCount?: number;
  navigationLinks: string[];
  interactions: InteractionStep[];
  formDataMappings?: Record<string, string>;
  delayBetweenActions: number;
  randomBehaviorVariation: number;
  proxyUrl?: string;
  customHeaders?: Record<string, string>;
  customCookies?: Record<string, string>;
  customUserAgent?: string;
  javascriptCode?: string;
  networkThrottle?: string;
  screenshotInterval?: number;
  errorNotifications: boolean;
  performanceLogging: boolean;
}

export interface ExecutionResult {
  success: boolean;
  duration: number;
  actionsCompleted: number;
  screenshotsTaken: number;
  error?: string;
  errorStack?: string;
}
