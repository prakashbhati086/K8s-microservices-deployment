const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const client = require('prom-client');

const app = express();

// Create a custom registry with default labels
const register = new client.Registry();
register.setDefaultLabels({
  app: 'auth-service'
});

// Enable default metrics collection (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const userRegistrations = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  registers: [register]
});

const userLogins = new client.Counter({
  name: 'user_logins_total',
  help: 'Total number of successful user logins',
  registers: [register]
});

const loginFailures = new client.Counter({
  name: 'user_login_failures_total',
  help: 'Total number of failed login attempts',
  labelNames: ['reason'],
  registers: [register]
});

const dbConnections = new client.Gauge({
  name: 'mongodb_connection_status',
  help: 'MongoDB connection status (1=connected, 0=disconnected)',
  registers: [register]
});

const totalUsers = new client.Gauge({
  name: 'total_users',
  help: 'Total number of registered users',
  registers: [register]
});

// Express middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'authsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
  });
  
  next();
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb-service:27017/simplemicro';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  dbConnections.set(1);
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  dbConnections.set(0);
});

// Update connection status when it changes
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
  dbConnections.set(1);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
  dbConnections.set(0);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  dbConnections.set(0);
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    trim: true,
    unique: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastLogin: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

const User = mongoose.model('User', userSchema);

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  try {
    // Update MongoDB connection status
    dbConnections.set(mongoose.connection.readyState === 1 ? 1 : 0);
    
    // Update total users count
    if (mongoose.connection.readyState === 1) {
      const userCount = await User.countDocuments();
      totalUsers.set(userCount);
    }
    
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('❌ Metrics error:', error);
    res.status(500).end('Error generating metrics');
  }
});

// Routes
app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const userCount = dbStatus === 'connected' ? await User.countDocuments() : 0;
    
    res.json({ 
      status: 'ok', 
      service: 'auth-service', 
      time: new Date().toISOString(),
      database: dbStatus,
      totalUsers: userCount
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      service: 'auth-service', 
      time: new Date().toISOString(),
      database: 'error'
    });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username, email and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email or username' 
      });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await user.save();
    
    // Increment metrics
    userRegistrations.inc();
    console.log(`✅ User created: ${username} (${email})`);

    res.status(201).json({ 
      success: true, 
      message: 'Account created successfully',
      user: { 
        id: user._id,
        username: user.username, 
        email: user.email,
        createdAt: user.createdAt
      } 
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email or username' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Account creation failed. Please try again.' 
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }

    // Find user (case-insensitive email search)
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log(`❌ Login attempt failed - user not found: ${email}`);
      loginFailures.inc({ reason: 'user_not_found' });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log(`❌ Login attempt failed - invalid password: ${email}`);
      loginFailures.inc({ reason: 'invalid_password' });
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set session
    req.session.user = { 
      id: user._id,
      email: user.email, 
      username: user.username,
      lastLogin: user.lastLogin
    };

    // Increment success metrics
    userLogins.inc();
    console.log(`✅ User logged in: ${user.username} (${user.email})`);
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      user: req.session.user 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed. Please try again.' 
    });
  }
});

app.get('/api/me', (req, res) => {
  res.json({ 
    authenticated: !!req.session.user, 
    user: req.session.user || null 
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ 
        success: false, 
        message: 'Logout failed' 
      });
    }
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

// Get user stats (new endpoint)
app.get('/api/stats', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const userCount = await User.countDocuments();
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      stats: {
        totalUsers: userCount,
        recentUsers,
        currentUser: req.session.user
      }
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch stats' 
    });
  }
});

// Debug route - get all users (remove in production)
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username email createdAt lastLogin');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received. Closing connections...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received. Closing connections...');
  await mongoose.connection.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Auth service running on port ${PORT}`);
  console.log(`🔗 MongoDB URI: ${MONGO_URI}`);
  console.log(`📊 Metrics available at: http://localhost:${PORT}/metrics`);
});

module.exports = app;
