import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();

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

// ─── Startup Logic & Database Middleware ────────────────────────────────────
const PORT = process.env.PORT || 8070;

const initDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }
};

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  initDB().then(() => {
    app.listen(PORT, () => console.log(`✅ Local Server: http://localhost:${PORT}`));
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

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  res.json({ status: 'ok', database: dbStatus, env: process.env.NODE_ENV });
});
app.use('/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/enquiries', enquiryRoutes);
app.use('/chat', chatRoutes);

export default app;

