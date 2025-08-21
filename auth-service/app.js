const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const app = express();
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

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb-service:27017/simplemicro';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

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

// Routes
app.get('/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const userCount = dbStatus === 'connected' ? await User.countDocuments() : 0;
  
  res.json({ 
    status: 'ok', 
    service: 'auth-service', 
    time: new Date().toISOString(),
    database: dbStatus,
    totalUsers: userCount
  });
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
app.get('/stats', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect('/login');
    }

    const response = await axios.get(`${AUTH_URL}/api/stats`, {
      timeout: 8000,
      headers: {
        'Cookie': req.get('Cookie') // Forward session cookie
      }
    });

    res.render('stats', { 
      user: req.session.user, 
      stats: response.data.stats 
    });
  } catch (error) {
    console.error('❌ Stats error:', error);
    res.render('stats', { 
      user: req.session.user, 
      stats: null, 
      error: 'Failed to load statistics' 
    });
  }
});

// Check if user exists
const existingUser = await User.findOne({
  $or: [{ email }, { username }]
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
      email,
      password: hashedPassword
    });

    await user.save();
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
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

    console.log(`✅ User logged in: ${username} (${email})`);
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

    const totalUsers = await User.countDocuments();
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
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
});
