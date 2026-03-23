import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Security Middlewares
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());

// Rate Limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per 15 mins
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', apiLimiter);

import ChatMessage from './models/ChatMessage.js';

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let adminSocketId = null;

io.on('connection', (socket) => {
  console.log(`[Chat] Socket connected: ${socket.id}`);

  // ── Admin joins ──────────────────────────────────────────────────────────────
  socket.on('admin:join', async () => {
    adminSocketId = socket.id;
    socket.join('admin-room');
    console.log('[Chat] Admin connected:', socket.id);

    // Fetch existing unique rooms from DB
    try {
      const uniqueRooms = await ChatMessage.aggregate([
        { $sort: { timestamp: -1 } },
        { 
          $group: { 
            _id: '$roomId', 
            userName: { $first: '$userName' },
            lastMessage: { $first: '$text' },
            timestamp: { $first: '$timestamp' }
          }
        },
        { $sort: { timestamp: -1 } }
      ]);
      
      const rooms = await Promise.all(uniqueRooms.map(async (r) => {
        const messages = await ChatMessage.find({ roomId: r._id }).sort({ timestamp: 1 }).limit(100);
        return { roomId: r._id, userName: r.userName, messages };
      }));

      socket.emit('admin:rooms', rooms);
    } catch (err) {
      console.error('[Chat] Error fetching rooms:', err);
    }
  });

  // ── User joins (or rejoins) a chat room ─────────────────────────────────────
  socket.on('user:join', async ({ roomId, userName }) => {
    socket.join(roomId);
    console.log(`[Chat] User "${userName}" joined room ${roomId}`);

    // Fetch history from DB
    try {
      const history = await ChatMessage.find({ roomId }).sort({ timestamp: 1 }).limit(100);
      socket.emit('chat:history', history);

      // Notify admin if online
      if (adminSocketId) {
        io.to(adminSocketId).emit('admin:user-joined', {
          roomId,
          userName: userName || (history[0]?.userName) || 'Guest',
          messages: history
        });
      }
    } catch (err) {
      console.error('[Chat] Error fetching history:', err);
    }
  });

  // ── User sends message ───────────────────────────────────────────────────────
  socket.on('user:message', async ({ roomId, text }) => {
    try {
      // Find latest message to get the correct userName
      const lastMsg = await ChatMessage.findOne({ roomId }).sort({ timestamp: -1 });
      const uName = lastMsg ? lastMsg.userName : 'Guest';

      const msg = new ChatMessage({
        roomId,
        userName: uName,
        sender: 'user',
        senderName: uName,
        text,
        timestamp: new Date().toISOString(),
      });
      await msg.save();

      // Deliver to user & admin
      io.to(roomId).emit('chat:message', msg);
      if (adminSocketId) {
        io.to(adminSocketId).emit('chat:message', { ...msg.toObject(), roomId });
      }
    } catch (err) {
      console.error('[Chat] User message error:', err);
    }
  });

  // ── Admin sends message ──────────────────────────────────────────────────────
  socket.on('admin:message', async ({ roomId, text }) => {
    try {
      const lastMsg = await ChatMessage.findOne({ roomId }).sort({ timestamp: -1 });
      const uName = lastMsg ? lastMsg.userName : 'Guest';

      const msg = new ChatMessage({
        roomId,
        userName: uName,
        sender: 'admin',
        senderName: 'Support',
        text,
        timestamp: new Date().toISOString(),
      });
      await msg.save();

      // Deliver to user in that room & echo back to admin UI
      io.to(roomId).emit('chat:message', msg);
      socket.emit('chat:message', { ...msg.toObject(), roomId });
    } catch (err) {
      console.error('[Chat] Admin message error:', err);
    }
  });

  // ── Disconnect ───────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (socket.id === adminSocketId) {
      adminSocketId = null;
      console.log('[Chat] Admin disconnected');
    }
    console.log(`[Chat] Socket disconnected: ${socket.id}`);
  });
});

// ─── Express Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/enquiries', enquiryRoutes);

// ─── Start Server (local dev vs Vercel) ──────────────────────────────────────
const PORT = process.env.PORT || 8070;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  async function startLocalServer() {
    try {
      await connectDB();
      httpServer.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
    } catch (err) {
      console.error('❌ Database connection failed:', err.message);
      process.exit(1);
    }
  }
  startLocalServer();
} else {
  // Production / Vercel: Connect DB once when function loads
  connectDB().catch(err => console.error('DB Init Error:', err.message));
}

export { app, httpServer };
export default app;
