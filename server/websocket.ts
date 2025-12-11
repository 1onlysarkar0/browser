import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

let wss: WebSocketServer;
const clients = new Set<WebSocket>();

export type WSMessage = 
  | { type: "status"; data: any }
  | { type: "executions"; data: any }
  | { type: "screenshots"; data: any }
  | { type: "urls"; data: any }
  | { type: "recordings"; data: any };

export function initWebSocket(httpServer: Server) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`WebSocket client connected. Total clients: ${clients.size}`);

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`WebSocket client disconnected. Total clients: ${clients.size}`);
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
      clients.delete(ws);
    });
  });

  console.log("WebSocket server initialized on /ws");
}

export function broadcast(message: WSMessage) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function broadcastStatus(statusData: any) {
  broadcast({ type: "status", data: statusData });
}

export function broadcastExecutions(executionsData: any) {
  broadcast({ type: "executions", data: executionsData });
}

export function broadcastScreenshots(screenshotsData: any) {
  broadcast({ type: "screenshots", data: screenshotsData });
}

export function broadcastUrls(urlsData: any) {
  broadcast({ type: "urls", data: urlsData });
}

export function broadcastRecordings(recordingsData: any) {
  broadcast({ type: "recordings", data: recordingsData });
}

export function getConnectedClients() {
  return clients.size;
}
