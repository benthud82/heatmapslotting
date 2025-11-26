const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook (MUST be before express.json() middleware for raw body)
app.use('/api/stripe/webhook', require('./routes/stripe'));

// Middleware
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

// Routes

app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/layouts', authMiddleware, require('./routes/layouts'));
app.use('/api/elements', authMiddleware, require('./routes/bays')); // warehouse elements
app.use('/api/picks', authMiddleware, require('./routes/picks')); // pick transactions
app.use('/api/user', authMiddleware, require('./routes/user')); // user preferences and profile
app.use('/api', authMiddleware, require('./routes/routeMarkers')); // route markers for walk distance

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
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

// Server ready (restarted for mock mode)

