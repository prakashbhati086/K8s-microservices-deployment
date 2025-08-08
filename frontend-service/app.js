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
  saveUninitialized: false
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
  req.session.destroy(() => {
    res.render('logout');
  });
});

// Signup proxy - server -> auth-service
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const resp = await axios.post(`${AUTH_SERVICE_URL}/signup`, { name, email, password });
    // On success, redirect to login page (or auto-login)
    res.redirect('/login');
  } catch (err) {
    const message = err?.response?.data?.error || 'Signup failed';
    res.status(400).render('signup', { error: message });
  }
});

// Login proxy - server -> auth-service
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const resp = await axios.post(`${AUTH_SERVICE_URL}/login`, { email, password });
    // Save minimal user info in session (email)
    req.session.user = { email };
    res.redirect('/');
  } catch (err) {
    const message = err?.response?.data?.error || 'Login failed';
    res.status(401).render('login', { error: message });
  }
});

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Start
app.listen(PORT, () => console.log(`Frontend service running on port ${PORT}`));
