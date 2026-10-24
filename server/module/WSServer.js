import { WebSocket, WebSocketServer } from 'ws';
import db from './Database.js';
import server from './Server.js';
import {
  createClientSnapshot,
  isAllowedWsOrigin,
  isWsConfigured,
  verifyWsToken,
} from './wsSecurity.js';

const AUTH_TIMEOUT_MS = 120000;
const MAX_MESSAGE_BYTES = 16 * 1024;

class WSServer {
  constructor() {
    this.wss = new WebSocketServer({
      server: server.http,
      maxPayload: MAX_MESSAGE_BYTES,
      perMessageDeflate: false,
    });
    this.clients = new Set(); // Authenticated clients only.
    this.counter = 0;
    if (!isWsConfigured(process.env.DASHBOARDX_WS_TOKEN)) {
      console.warn('WebSocket disabled: set DASHBOARDX_WS_TOKEN (32+ characters) in your local .env');
    }
    this.init();
  }

  init() {
    this.wss.on('connection', (ws, request) => {
      if (!isWsConfigured(process.env.DASHBOARDX_WS_TOKEN)) {
        ws.close(1013, 'WebSocket authentication is not configured');
        return;
      }
      if (!isAllowedWsOrigin(request.headers.origin, request.headers.host)) {
        ws.close(1008, 'Origin not allowed');
        return;
      }

      ws.id = this.counter++;
      let authenticated = false;
      const authTimeout = setTimeout(() => ws.close(1008, 'Authentication timeout'), AUTH_TIMEOUT_MS);
      authTimeout.unref?.();
      ws.send(JSON.stringify({ type: 'wsServer:auth:required' }));

      ws.on('message', (rawMessage) => {
        let data;
        try {
          data = JSON.parse(rawMessage.toString());
          if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.type !== 'string') {
            throw new Error('Invalid request');
          }
        } catch {
          ws.close(1003, 'Invalid message');
          return;
        }

        if (!authenticated) {
          if (data.type !== 'auth' || !verifyWsToken(data.token, process.env.DASHBOARDX_WS_TOKEN)) {
            ws.close(1008, 'Authentication failed');
            return;
          }
          authenticated = true;
          clearTimeout(authTimeout);
          this.clients.add(ws);
          ws.send(JSON.stringify({ type: 'wsServer:auth:ok' }));
          ws.send(JSON.stringify({
            type: 'wsServer:message:db',
            message: createClientSnapshot(db),
          }));
          return;
        }

        if (data.type === 'get#workplace') {
          ws.send(JSON.stringify({
            type: 'wsServer:message:workplace',
            message: createClientSnapshot(db).workplace,
          }));
        } else {
          ws.send(JSON.stringify({ type: 'wsServer:error', message: 'Unknown request' }));
        }
      });

      ws.on('close', () => {
        clearTimeout(authTimeout);
        this.clients.delete(ws);
      });
      ws.on('error', (error) => console.warn('WebSocket client error:', error.message));
    });
  }

  sendAll(data) {
    const message = JSON.stringify(data);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(message);
    }
  }

  sendOne(data, filter) {
    const message = JSON.stringify(data);
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN && filter(ws)) ws.send(message);
    }
  }

  sendLog(link, data) {
    const date = new Date();
    this.sendAll({
      type: 'serverLog',
      link,
      datetime: {
        d: date.toLocaleDateString('ru-RU'),
        t: date.toLocaleTimeString('ru-RU'),
      },
      message: data,
    });
  }
}

export default new WSServer();
