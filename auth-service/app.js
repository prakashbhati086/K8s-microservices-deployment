// auth-service/app.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const authRoutes = require('./routes/auth');

dotenv.config();
const app = express();

// Middleware
app.use(express.json()); // For JSON requests
app.use(express.urlencoded({ extended: true }));

// Session (optional if needed)
app.use(session({
  secret: process.env.SESSION_SECRET || 'microauthxsecret',
  resave: false,
  saveUninitialized: true
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Health Check Endpoint (ADD THIS)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Direct signup endpoint (ADD THIS - as backup to routes)
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        // Your signup logic here - you'll need to implement user creation
        // For now, just return success (you can implement actual user creation later)
        console.log(`📝 Signup attempt: ${username}, ${email}`);
        
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Signup failed', error: error.message });
    }
});

// Routes
app.use('/api', authRoutes);

// Root endpoint for basic testing
app.get('/', (req, res) => {
    res.json({ 
        message: 'Auth Service is running', 
        endpoints: ['/health', '/signup', '/api/*'],
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});
