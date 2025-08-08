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

// Routes
app.use('/api', authRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});
