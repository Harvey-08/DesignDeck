import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('--- Environment Check ---');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
if (!process.env.JWT_SECRET) {
  console.log('WARNING: JWT_SECRET is missing from process.env');
}
console.log('-------------------------');

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import cors from 'cors';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const Y = require('yjs');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
import Canvas from './models/Canvas.js';
import Event from './models/Event.js';
import Comment from './models/Comment.js';
import authRoutes from './routes/authRoutes.js';
import canvasRoutes from './routes/canvasRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import botRoutes from './routes/botRoutes.js';
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/bot', botRoutes);

// Health Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'Backend is alive',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: PORT
  });
});

// ----------------------------------------------------
// MongoDB Connection
// ----------------------------------------------------

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;

console.log(`[DB] Attempting to connect to: ${mongoURI}`);
mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000,
})
  .then(async () => {
    console.log(`[DB] MongoDB Connected: ${mongoURI}`);
    console.log(`[DB] Database Name: ${mongoose.connection.name}`);

    try {
      // Diagnostic check
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      const canvasCount = await mongoose.connection.db.collection('canvases').countDocuments();
      console.log(`--- DB Diagnostics ---`);
      console.log(`Users in DB: ${userCount}`);
      console.log(`Canvases in DB: ${canvasCount}`);
      console.log(`----------------------`);
    } catch (e) {
      console.log('[DB] [Diagnostics] Collection not initialized yet.');
    }
  })
  .catch(err => {
    console.error('[DB] MongoDB Connection Error:', err.message);
  });

mongoose.connection.on('error', err => {
  console.error('[DB] MongoDB Runtime Error:', err);
});

// ----------------------------------------------------
// HTTP + WebSocket Server Setup
// ----------------------------------------------------
const server = http.createServer(app);

// Setup Socket.IO for chat/comments
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set('socketio', io);


io.on('connection', (socket) => {
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
  });

  socket.on('add_object_comment', async (data) => {
    try {
      const { sessionId, objectId, message, user } = data;
      const newComment = await Comment.create({
        sessionId,
        objectId,
        message,
        user
      });

      // Broadcast to everyone in the room
      io.to(sessionId).emit('object_comment_added', newComment);
    } catch (error) {
      console.error('Socket error adding comment:', error);
    }
  });
});

// Setup Yjs WebSocket
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/socket.io/')) {
    // Socket.IO engine will automatically handle this if attached to `server`.
  } else {
    // Hand over to Y-Websocket
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

// ----------------------------------------------------
// Yjs Persistence Logic
// ----------------------------------------------------
const docsLoading = new Set();

setPersistence({
  bindState: async (docName, doc) => {
    const cleanDocName = docName.startsWith('/') ? docName.slice(1) : docName;
    try {
      docsLoading.add(cleanDocName);
      console.log(`[Yjs] [Lock] Locked ${cleanDocName} for loading...`);
      console.log(`[Yjs] Loading state for room: "${cleanDocName}" (original: "${docName}")`);

      const savedCanvas = await Canvas.findOne({ canvasId: cleanDocName });

      // --- TIMELINE LOGGING (US1) ---
      if (!doc._hasEventLogger) {
        let batchTimeout = null;
        let isFirstEvent = true;
        let lastSaveTime = 0;

        const saveBatchEvent = async (docState) => {
          try {
            await Event.create({
              canvasId: cleanDocName,
              update: Buffer.from(docState),
              type: 'state-batch'
            });
            console.log(`[EventLog] Saved batch state snapshot for ${cleanDocName}`);
          } catch (err) {
            console.error(`[EventLog] Error saving batch update for ${cleanDocName}:`, err);
          }
        };

        doc.on('update', async (update, origin) => {
          if (isFirstEvent) {
            isFirstEvent = false;
            lastSaveTime = Date.now();
            const docState = Y.encodeStateAsUpdate(doc);
            saveBatchEvent(docState);
            return;
          }

          const now = Date.now();
          if (now - lastSaveTime > 250) {
            lastSaveTime = now;
            const docState = Y.encodeStateAsUpdate(doc);
            saveBatchEvent(docState);
          } else {
            clearTimeout(batchTimeout);
            batchTimeout = setTimeout(() => {
              lastSaveTime = Date.now();
              const docState = Y.encodeStateAsUpdate(doc);
              saveBatchEvent(docState);
            }, 300);
          }
        });

        doc._hasEventLogger = true;
        console.log(`[EventLog] Attached batched timeline logger to room: ${cleanDocName}`);
      }

      if (savedCanvas && savedCanvas.documentState) {
        console.log(`[Yjs] Found state for ${cleanDocName} (${savedCanvas.documentState.length} bytes)`);
        Y.applyUpdate(doc, new Uint8Array(savedCanvas.documentState));
      } else {
        console.log(`[Yjs] No existing state found in DB for "${cleanDocName}". Initializing default state...`);
        doc.transact(() => {
          const yLayers = doc.getArray('layers');
          if (yLayers.length === 0) {
            yLayers.push([{
              id: 'default-layer',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1.0,
              objects: [],
              metadata: {},
            }]);
          }
        });
      }

      if (!doc._hasSessionTimer) {
        doc._hasSessionTimer = true;
        const sessionMeta = doc.getMap('sessionMeta');

        if (savedCanvas && savedCanvas.expiresAt) {
          const expiryTime = new Date(savedCanvas.expiresAt).getTime();

          const intervalId = setInterval(() => {
            const now = Date.now();
            const remainingSeconds = Math.round((expiryTime - now) / 1000);

            if (remainingSeconds === 300 || remainingSeconds === 60 || remainingSeconds === 10) {
              sessionMeta.set('sessionWarning', { remaining: remainingSeconds, ts: now });
            }

            if (remainingSeconds <= 0) {
              clearInterval(intervalId);
              sessionMeta.set('sessionWarning', { remaining: 0, ts: now });
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error(`[Yjs] Error loading document ${docName}:`, err);
    } finally {
      docsLoading.delete(cleanDocName);
      console.log(`[Yjs] [Lock] Unlocked ${cleanDocName} (Load complete)`);
    }
  },
  writeState: async (docName, doc) => {
    const cleanDocName = docName.startsWith('/') ? docName.slice(1) : docName;
    if (docsLoading.has(cleanDocName)) return;

    try {
      const update = Y.encodeStateAsUpdate(doc);
      if (update.length < 10) return;

      console.log(`[Yjs] Saving state for "${cleanDocName}" (${update.length} bytes)`);
      await Canvas.findOneAndUpdate(
        { canvasId: cleanDocName },
        { documentState: Buffer.from(update) },
        { upsert: true, new: true, timestamps: true }
      );
    } catch (err) {
      console.error(`[Yjs] Error saving document ${docName}:`, err);
    }
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint ready`);
});
