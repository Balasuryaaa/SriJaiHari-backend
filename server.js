import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import ChatMessage from './models/ChatMessage.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// ─── Security & Initial Middlewares ───────────────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests'
});
app.use('/api/', apiLimiter);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
// NOTE: On Vercel Functions, Socket.IO won't persist across requests. 
// Standard Socket.IO requires a real server (e.g., node server.js).
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

let adminSocketId = null;
io.on('connection', (socket) => {
  socket.on('admin:join', () => { adminSocketId = socket.id; });
  socket.on('user:join', async ({ roomId }) => {
    socket.join(roomId);
    const history = await ChatMessage.find({ roomId }).sort({ createdAt: 1 }).limit(50);
    socket.emit('chat:history', history);
  });
  socket.on('user:message', async ({ roomId, text }) => {
    const chatMsg = new ChatMessage({ roomId, text, sender: 'user' });
    await chatMsg.save();
    io.to(roomId).emit('chat:message', chatMsg);
    if (adminSocketId) io.to(adminSocketId).emit('chat:admin_alert', { roomId, text });
  });
  socket.on('admin:message', async ({ roomId, text }) => {
    const chatMsg = new ChatMessage({ roomId, text, sender: 'admin' });
    await chatMsg.save();
    io.to(roomId).emit('chat:message', chatMsg);
  });
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ status: 'ok', database: dbStatus, env: process.env.NODE_ENV });
});
app.use('/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/enquiries', enquiryRoutes);

// ─── Startup Logic (Local vs Vercel) ─────────────────────────────────────────
const PORT = process.env.PORT || 8070;

// Connect once on start or on every serverless invocation if needed
const initDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
};

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDB().then(() => {
    httpServer.listen(PORT, () => console.log(`✅ Local Server: http://localhost:${PORT}`));
  });
} else {
  // Production middleware to ensure DB is connected before any route
  app.use(async (req, res, next) => {
    try {
      await initDB();
      next();
    } catch (err) {
      console.error('DB Middleware Error:', err.message);
      res.status(500).json({ error: 'Database connection failed' });
    }
  });
}

export default app;
