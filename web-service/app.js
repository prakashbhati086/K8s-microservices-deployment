const express = require('express');
const session = require('express-session');
const path = require('path');
const axios = require('axios');
const client = require('prom-client');
const app = express();
const AUTH_URL = process.env.AUTH_URL || 'http://auth-service:3000';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'websecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'web-service', time: new Date().toISOString() }));

app.get('/', (req, res) => {
  pageViews.labels('home').inc();
  res.render('home', { user: req.session.user || null });
});
app.get('/login', (req, res) => {
  pageViews.labels('login').inc();
  res.render('login', { error: null, success: req.query.success || null });
});
app.get('/signup', (req, res) => {pageViews.labels('login').inc(); 
res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body || {};
  try {
    await axios.post(`${AUTH_URL}/api/signup`, { username, email, password }, { timeout: 8000 });
    res.redirect('/login?success=Account created. Please log in.');
  } catch (e) {
    res.status(400).render('signup', { error: e.response?.data?.message || 'Signup failed' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const r = await axios.post(`${AUTH_URL}/api/login`, { email, password }, { timeout: 8000 });
    req.session.user = r.data.user;
    res.redirect('/');
  } catch (e) {
    res.status(401).render('login', { error: e.response?.data?.message || 'Login failed', success: null });
  }
});

app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`web-service on ${PORT}, auth at ${AUTH_URL}`));


const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const pageViews = new client.Counter({
  name: 'page_views_total',
  help: 'Total number of page views',
  labelNames: ['page']
});

client.collectDefaultMetrics({ timeout: 5000 });