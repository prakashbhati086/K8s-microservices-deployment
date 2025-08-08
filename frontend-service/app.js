// frontend-service/app.js
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Config
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000/api';
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
  secret: process.env.SESSION_SECRET || 'frontendsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes

// Home
app.get('/', (req, res) => {
  const user = req.session.user || null;
  res.render('home', { user });
});

// Login page (render)
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Signup page (render)
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Session destroy error:', err);
    }
    res.render('logout');
  });
});

// Signup proxy - server -> auth-service (FIXED VERSION)
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Input validation
    if (!name || !email || !password) {
      return res.status(400).render('signup', { 
        error: 'All fields are required' 
      });
    }
    
    console.log('📝 Frontend sending signup request for:', email);
    
    // Map 'name' to 'username' for auth-service compatibility
    const signupData = { 
      username: name.trim(),
      email: email.trim().toLowerCase(), 
      password 
    };
    
    const resp = await axios.post(`${AUTH_SERVICE_URL}/signup`, signupData, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Signup successful for:', email);
    
    // Redirect to login page with success message
    res.redirect('/login?success=Account created successfully! Please log in.');
    
  } catch (err) {
    console.error('❌ Signup error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    
    let errorMessage = 'Signup failed. Please try again.';
    
    if (err.response?.data) {
      errorMessage = err.response.data.message || 
                    err.response.data.error || 
                    errorMessage;
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to authentication service. Please try again later.';
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = 'Authentication service unavailable. Please try again later.';
    }
    
    res.status(400).render('signup', { error: errorMessage });
  }
});

// Login proxy - server -> auth-service (ENHANCED VERSION)
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Input validation
    if (!email || !password) {
      return res.status(400).render('login', { 
        error: 'Email and password are required' 
      });
    }
    
    console.log('🔐 Frontend sending login request for:', email);
    
    const loginData = {
      email: email.trim().toLowerCase(),
      password
    };
    
    const resp = await axios.post(`${AUTH_SERVICE_URL}/login`, loginData, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Store complete user info from auth-service response
    req.session.user = {
      id: resp.data.user?.id,
      email: resp.data.user?.email || email,
      username: resp.data.user?.username || email.split('@')[0],
      loginTime: new Date().toISOString()
    };
    
    console.log('✅ Login successful for:', email);
    res.redirect('/');
    
  } catch (err) {
    console.error('❌ Login error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });
    
    let errorMessage = 'Login failed. Please check your credentials.';
    
    if (err.response?.data) {
      errorMessage = err.response.data.message || 
                    err.response.data.error || 
                    errorMessage;
    } else if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to authentication service. Please try again later.';
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = 'Authentication service unavailable. Please try again later.';
    }
    
    res.status(401).render('login', { error: errorMessage });
  }
});

// Profile/Dashboard route (NEW)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('profile', { user: req.session.user });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'frontend-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    authServiceUrl: AUTH_SERVICE_URL
  });
});

// Check authentication status (API endpoint)
app.get('/api/auth/status', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null
  });
});

// Middleware to check authentication for protected routes
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
};

// Protected routes example
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { user: req.session.user });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).render('error', { 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { 
    url: req.originalUrl 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Frontend service running on port ${PORT}`);
  console.log(`🔗 Auth service URL: ${AUTH_SERVICE_URL}`);
  console.log(`🌐 Health check available at: http://localhost:${PORT}/health`);
});

module.exports = app;
