const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook (MUST be before express.json() middleware for raw body)
app.use('/api/stripe/webhook', require('./routes/stripe'));

// Security headers
app.use(helmet());

// Rate limiting - general API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 auth attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);

// CORS - restrict to your domain in production
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
const authMiddleware = require('./middleware/auth');

app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/layouts', authMiddleware, require('./routes/layouts'));
app.use('/api/elements', authMiddleware, require('./routes/bays'));
app.use('/api/picks', authMiddleware, require('./routes/picks'));
app.use('/api/user', authMiddleware, require('./routes/user'));
app.use('/api', authMiddleware, require('./routes/routeMarkers'));

// Error handling middleware - sanitized for production
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.path,
    method: req.method,
  });

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

