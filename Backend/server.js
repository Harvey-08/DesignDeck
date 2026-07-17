import './config/env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import meetingRoutes from './routes/meetingRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import MeetingMessage from './models/MeetingMessage.js';
import Meeting from './models/Meeting.js';
import Notification from './models/Notification.js';
import { Server } from "socket.io";
import folderRoutes from './routes/folderRoutes.js';

const app = express();
const PORT = process.env.PORT;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/folders', folderRoutes);

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
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.set('socketio', io);


io.on('connection', (socket) => {
  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
  });

  socket.on('host-control-change', (data) => {
    const { roomId, key, value } = data;
    io.to(`meeting:${roomId}`).emit('host-control-updated', { key, value });
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

  // ----------------------------------------------------
  // WebRTC Meeting Signaling & Chat Handlers
  // ----------------------------------------------------
  socket.on('join-room', async (data) => {
    const { roomId, userId, name, isAudioMuted, isVideoDisabled, isSharingScreen } = data;
    if (!roomId || !userId) return;

    // Force cleanup of any existing socket connection for the same user in this room
    const clients = io.sockets.adapter.rooms.get(`meeting:${roomId}`);
    if (clients) {
      for (const clientId of clients) {
        if (clientId !== socket.id) {
          const clientSocket = io.sockets.sockets.get(clientId);
          if (clientSocket && clientSocket.meetingUser && clientSocket.meetingUser.userId === userId) {
            console.log(`[Socket] Force removing duplicate socket connection ${clientId} for user ${name}`);
            socket.to(`meeting:${roomId}`).emit('user-left', {
              socketId: clientId
            });
            clientSocket.leave(`meeting:${roomId}`);
            clientSocket.meetingRoomId = null;
          }
        }
      }
    }

    socket.meetingRoomId = roomId;
    socket.meetingUser = { userId, name, isAudioMuted, isVideoDisabled, isSharingScreen };
    await socket.join(`meeting:${roomId}`);

    console.log(`[Socket] Peer ${name} (${userId}) joined meeting room: ${roomId}`);

    // Update participants in MongoDB if meeting is active
    try {
      const meeting = await Meeting.findOne({ meetingId: roomId });
      if (meeting && meeting.status === 'active') {
        const alreadyIn = meeting.participants.some(p => p.user.toString() === userId.toString());
        if (!alreadyIn) {
          meeting.participants.push({ user: userId, joinedAt: new Date() });
          await meeting.save();
        }
      }
    } catch (dbErr) {
      console.error('Error updating meeting participants in DB:', dbErr);
    }

    // Get active sockets in this meeting room
    const roomClients = io.sockets.adapter.rooms.get(`meeting:${roomId}`);
    const activePeers = [];
    if (roomClients) {
      for (const clientId of roomClients) {
        if (clientId !== socket.id) {
          const clientSocket = io.sockets.sockets.get(clientId);
          if (clientSocket && clientSocket.meetingUser) {
            activePeers.push({
              socketId: clientId,
              user: clientSocket.meetingUser
            });
          }
        }
      }
    }

    // Send existing peers list to the newly joined peer
    socket.emit('meeting-users', activePeers);

    // Notify other peers that a new user has joined
    socket.to(`meeting:${roomId}`).emit('user-joined', {
      socketId: socket.id,
      user: socket.meetingUser
    });
  });

  socket.on('offer', (data) => {
    const { target, offer } = data;
    io.to(target).emit('offer', {
      sender: socket.id,
      offer
    });
  });

  socket.on('answer', (data) => {
    const { target, answer } = data;
    io.to(target).emit('answer', {
      sender: socket.id,
      answer
    });
  });

  socket.on('ice-candidate', (data) => {
    const { target, candidate } = data;
    io.to(target).emit('ice-candidate', {
      sender: socket.id,
      candidate
    });
  });

  socket.on('leave-room', (data) => {
    const { roomId } = data;
    if (roomId) {
      socket.to(`meeting:${roomId}`).emit('user-left', {
        socketId: socket.id
      });
      socket.leave(`meeting:${roomId}`);
      console.log(`[Socket] Peer ${socket.meetingUser?.name} left meeting room: ${roomId}`);
    }
  });

  socket.on('peer-toggle-audio', (data) => {
    const { roomId, isMuted } = data;
    if (socket.meetingUser) {
      socket.meetingUser.isAudioMuted = isMuted;
    }
    socket.to(`meeting:${roomId}`).emit('peer-toggle-audio', {
      senderSocketId: socket.id,
      isMuted
    });
  });

  socket.on('peer-toggle-video', (data) => {
    const { roomId, isVideoOff } = data;
    if (socket.meetingUser) {
      socket.meetingUser.isVideoDisabled = isVideoOff;
    }
    socket.to(`meeting:${roomId}`).emit('peer-toggle-video', {
      senderSocketId: socket.id,
      isVideoOff
    });
  });

  socket.on('peer-toggle-screen', (data) => {
    const { roomId, isSharingScreen } = data;
    if (socket.meetingUser) {
      socket.meetingUser.isSharingScreen = isSharingScreen;
    }
    socket.to(`meeting:${roomId}`).emit('peer-toggle-screen', {
      senderSocketId: socket.id,
      isSharingScreen
    });
  });

  socket.on('chat-message', async (data) => {
    const { roomId, senderId, senderName, message } = data;
    if (!roomId || !senderId || !message) return;

    try {
      const newMessage = await MeetingMessage.create({
        meetingId: roomId,
        sender: senderId,
        senderName,
        message,
        timestamp: new Date()
      });

      io.to(`meeting:${roomId}`).emit('chat-message', newMessage);
    } catch (err) {
      console.error('Error handling chat-message socket event:', err);
    }
  });

  socket.on('disconnect', () => {
    if (socket.meetingRoomId) {
      socket.to(`meeting:${socket.meetingRoomId}`).emit('user-left', {
        socketId: socket.id
      });
      console.log(`[Socket] Peer ${socket.meetingUser?.name} disconnected from meeting room: ${socket.meetingRoomId}`);
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

// ----------------------------------------------------
// Meeting Scheduler Poller (5-Minute Alert notifications)
// ----------------------------------------------------
setInterval(async () => {
  try {
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    const upcomingMeetings = await Meeting.find({
      status: 'scheduled',
      notifiedBefore: { $ne: true },
      scheduledAt: { $lte: fiveMinutesFromNow, $gte: new Date(Date.now() - 10 * 60 * 1000) } // Start in next 5m, or slightly past due (up to 10m ago) in case server was restarted
    });

    for (const meeting of upcomingMeetings) {
      console.log(`[Scheduler] Meeting "${meeting.title}" (${meeting.meetingId}) is starting in <= 5 minutes. Sending notifications...`);

      // Notify both host and all invited users
      const recipients = new Set();
      if (meeting.host) recipients.add(meeting.host.toString());
      for (const invitee of meeting.invitedUsers || []) {
        const declinedNotif = await Notification.findOne({
          recipient: invitee,
          meetingId: meeting.meetingId,
          type: 'meeting_invite',
          status: 'declined'
        });
        if (!declinedNotif) {
          recipients.add(invitee.toString());
        }
      }

      for (const userId of recipients) {
        await Notification.create({
          recipient: userId,
          sender: meeting.host,
          type: 'meeting_reminder',
          meetingId: meeting.meetingId,
          meetingTitle: meeting.title,
          status: 'unread'
        });
      }

      meeting.notifiedBefore = true;
      await meeting.save();
    }
  } catch (error) {
    console.error('[Scheduler] Error in meeting reminder poller:', error);
  }
}, 30000); // run every 30 seconds

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint ready`);
});
