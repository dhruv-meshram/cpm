import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { jwtVerify } from 'jose';
import { PrismaClient } from '@prisma/client';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, dir: './apps/web' });
const handle = app.getRequestHandler();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const EMIT_SECRET = process.env.EMIT_SECRET || 'dev-emit-secret';
const key = new TextEncoder().encode(JWT_SECRET);

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle internal WS bridge (/emit)
      if (req.method === 'POST' && pathname === '/emit') {
        const authHeader = req.headers.authorization;
        if (authHeader !== `Bearer ${EMIT_SECRET}`) {
          res.writeHead(401);
          return res.end('Unauthorized');
        }

        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const { room, event, payload } = JSON.parse(body);
            broadcastToRoom(room, event, payload);
            res.writeHead(200);
            res.end('OK');
          } catch (e) {
            res.writeHead(400);
            res.end('Bad Request');
          }
        });
        return;
      }

      // Default Next.js request handling
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // WebSocket Setup
  const wss = new WebSocketServer({ server });
  const clientRooms = new Map();

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    try {
      const { payload } = await jwtVerify(token, key);
      ws.userId = payload.userId;
      clientRooms.set(ws, new Set());
    } catch (err) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.on('message', async (message) => {
      try {
        const { type, room } = JSON.parse(message);
        if (type === 'join_project' && room) {
          const projectId = room.split(':')[1];
          if (!projectId) return;

          const membership = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: ws.userId } }
          });

          if (membership) {
            clientRooms.get(ws).add(room);
            ws.send(JSON.stringify({ event: 'joined', room }));
          } else {
            ws.send(JSON.stringify({ event: 'error', message: 'Forbidden' }));
          }
        } else if (type === 'leave_project' && room) {
          clientRooms.get(ws).delete(room);
        }
      } catch (e) {
        console.error('WS message parse error', e);
      }
    });

    ws.on('close', () => {
      clientRooms.delete(ws);
    });
  });

  function broadcastToRoom(room, event, payload) {
    const message = JSON.stringify({ event, payload });
    for (const [ws, rooms] of clientRooms.entries()) {
      if (rooms.has(room) && ws.readyState === 1) { // 1 = OPEN
        ws.send(message);
      }
    }
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
