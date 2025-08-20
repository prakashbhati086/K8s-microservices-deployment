const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'authsecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// In-memory store
const users = new Map(); // key: email, value: { username, email, passwordHash }

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', time: new Date().toISOString() });
});

app.post('/api/signup', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ success: false, message: 'All fields required' });
  if (users.has(email)) return res.status(400).json({ success: false, message: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  users.set(email, { username, email, passwordHash: hash });
  res.status(201).json({ success: true, user: { username, email } });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
  const u = users.get(email);
  if (!u) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  req.session.user = { email: u.email, username: u.username };
  res.json({ success: true, user: req.session.user });
});

app.get('/api/me', (req, res) => {
  res.json({ authenticated: !!req.session.user, user: req.session.user || null });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`auth-service on ${PORT}`));
