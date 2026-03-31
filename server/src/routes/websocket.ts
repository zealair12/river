import { WebSocketServer } from 'ws';
import type { Server } from 'http';

export function setupWebsocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws: import('ws').WebSocket) => {
    ws.on('message', () => {});
    ws.send(JSON.stringify({ type: 'connected' }));
  });
  return wss;
}
