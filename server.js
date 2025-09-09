import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect MongoDB
connectDB().catch((err) => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});

// Routes
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/admin', adminRoutes);
app.use('/products', productRoutes);
app.use('/enquiries', enquiryRoutes);

// ✅ Do NOT app.listen here – Vercel will handle it
export default app;
