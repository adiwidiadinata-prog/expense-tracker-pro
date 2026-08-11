/**
 * Expense Tracker Pro - Backend Server
 * Express.js + Firebase + Midtrans
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initFirebase } = require('./config/firebase');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Init Firebase Admin SDK
initFirebase();

const app = express();

// ==================== SECURITY MIDDLEWARE ====================
app.use(helmet());

app.use(cors({
  origin: [
    'https://expense-tracker-pro-h4ru.vercel.app',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Terlalu banyak permintaan. Coba lagi dalam 15 menit.' }
});

// Stricter limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Body parser — must be before routes
// Webhook needs raw body for Midtrans signature verification
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Expense Tracker Pro API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// ==================== ROUTES ====================
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const paymentRoutes = require('./routes/payment');

app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payment', paymentRoutes);

// Root info
app.get('/', (req, res) => {
  res.json({
    name: 'Expense Tracker Pro API',
    docs: '/health',
    version: '1.0.0'
  });
});

// ==================== ERROR HANDLERS ====================
app.use(notFound);
app.use(errorHandler);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    env: process.env.NODE_ENV,
    port: PORT
  });
});

module.exports = app;
