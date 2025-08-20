const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const authRoutes = require('../routes/auth');

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy (needed if behind ingress)
app.set('trust proxy', 1);

// Session configuration (MemoryStore OK for dev)
app.use(session({
  secret: process.env.SESSION_SECRET || 'microauthxsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api', authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Auth Service is running',
    endpoints: ['/health', '/api/signup', '/api/login', '/api/logout'],
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Closing Mongo connection...');
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('📴 SIGINT received. Closing Mongo connection...');
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});

module.exports = app;
