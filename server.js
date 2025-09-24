import dotenv from 'dotenv';
const isRailway = Object.keys(process.env).some(k => k.startsWith('RAILWAY_'));
if (!isRailway && process.env.NODE_ENV !== 'production') dotenv.config();

import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 8080;

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", "data:"],
      "style-src": ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      "script-src-elem": ["'self'", "http://localhost:5173", "http://127.0.0.1:5173", "'unsafe-inline'"],
      "connect-src": ["'self'", "http://localhost:5173", "ws://localhost:5173", "http://127.0.0.1:5173", "ws://127.0.0.1:5173"]
    }
  }
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'tiny'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const envVal = k => (process.env[k] || '').toString().trim().replace(/^['"]|['"]$/g, '');
const mongoUri =
  envVal('MONGODB_URI') ||
  envVal('MONGODB_URL') ||
  envVal('MONGO_URL')   ||
  envVal('MONGO_URI');

if (!mongoUri) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}
await mongoose.connect(mongoUri);

const userSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  githubId:   { type: String, index: true },
  createdAt:  { type: Date, default: Date.now }
}, { versionKey: false });

const itemSchema = new mongoose.Schema({
  userId:       { type: mongoose.Types.ObjectId, ref: 'User', index: true, required: true },
  name:         { type: String, required: true, maxlength: 100 },
  species:      { type: String, maxlength: 100 },
  lastWatered:  { type: Date, required: true },
  intervalDays: { type: Number, required: true, min: 1 },
  sunlight:     { type: String, enum: ['low','medium','high'], default: 'medium' },
  indoors:      { type: Boolean, default: true },
  notes:        { type: String, maxlength: 500 }
}, { timestamps: true, versionKey: false });

const User = mongoose.model('User', userSchema);
const Item = mongoose.model('Item', itemSchema);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  store: MongoStore.create({ mongoUrl: mongoUri })
}));

function loginUser(req, user, cb) { req.session.userId = user._id.toString(); cb?.(); }
function logoutUser(req, cb) { req.session.destroy(cb); }
async function currentUser(req) { return req.session.userId ? User.findById(req.session.userId).lean() : null; }
function requireAuth(req, res, next) { if (!req.session.userId) return res.status(401).json({ error: 'not authenticated' }); next(); }

const GITHUB_CLIENT_ID     = (process.env.GITHUB_CLIENT_ID || '').trim();
const GITHUB_CLIENT_SECRET = (process.env.GITHUB_CLIENT_SECRET || '').trim();
const GITHUB_CALLBACK_URL  = (process.env.GITHUB_CALLBACK_URL || '').trim();
const OAUTH_ENABLED = Boolean(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && GITHUB_CALLBACK_URL);

async function uniqueUsername(base, githubId) {
  let candidate = base || `gh_${githubId}`;
  let n = 1;
  while (await User.exists({ username: candidate })) {
    candidate = `${base}-${n++}`;
    if (n > 50) {
      candidate = `gh_${githubId}`;
      if (!await User.exists({ username: candidate })) break;
      candidate = `gh_${githubId}-${n}`;
    }
  }
  return candidate;
}

if (OAUTH_ENABLED) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => done(null, user._id.toString()));
  passport.deserializeUser(async (id, done) => {
    try { done(null, await User.findById(id).lean()); }
    catch (e) { done(e); }
  });

  passport.use(new GitHubStrategy(
    { clientID: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET, callbackURL: GITHUB_CALLBACK_URL },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const githubId = String(profile.id);
        const login    = profile.username || profile._json?.login || `gh_${githubId}`;
        let user = await User.findOne({ githubId });
        if (user) return done(null, user);
        const existingByUsername = await User.findOne({ username: login });
        if (existingByUsername) {
          if (!existingByUsername.githubId) {
            existingByUsername.githubId = githubId;
            await existingByUsername.save();
            return done(null, existingByUsername);
          }
        }
        const uname = await uniqueUsername(login, githubId);
        user = await User.create({ username: uname, githubId });
        return done(null, user);
      } catch (e) {
        return done(e);
      }
    }
  ));

  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

  app.get('/auth/github/callback', (req, res, next) => {
    passport.authenticate('github', async (err, user, info) => {
      const clientUrl = process.env.CLIENT_URL || '/';
      if (err || !user) {
        return res.redirect(`${clientUrl}?oauth=failed`);
      }
      req.login(user, (e2) => {
        if (e2) return res.redirect(`${clientUrl}?oauth=failed`);
        req.session.userId = user._id.toString();
        return res.redirect(clientUrl);
      });
    })(req, res, next);
  });
}

// API stuff
app.get('/api/config', (_req, res) => res.json({ oauthEnabled: OAUTH_ENABLED }));
app.get('/api/me', async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.json({ user: null });
  const { _id, username, githubId, createdAt } = user;
  res.json({ user: { _id, username, githubId, createdAt } });
});
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'missing credentials' });
  const existing = await User.findOne({ username });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });
    return loginUser(req, user, () => res.json({ ok: true, created: true, username: user.username }));
  }
  if (!existing.passwordHash) return res.status(400).json({ error: 'this account uses GitHub only' });
  const ok = await bcrypt.compare(password, existing.passwordHash);
  if (!ok) return res.status(401).json({ error: 'incorrect password' });
  return loginUser(req, existing, () => res.json({ ok: true, created: false, username: existing.username }));
});
app.post('/api/auth/logout', (req, res) => logoutUser(req, () => res.json({ ok: true })));
app.get('/api/items', requireAuth, async (req, res) => {
  const user = await currentUser(req);
  const items = await Item.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
  res.json({ items });
});
app.post('/api/items', requireAuth, async (req, res) => {
  const user = await currentUser(req);
  const { name, species, lastWatered, intervalDays, sunlight, indoors, notes } = req.body;
  if (!name || !lastWatered || !intervalDays) return res.status(400).json({ error: 'missing required fields' });
  const item = await Item.create({
    userId: user._id, name, species, lastWatered, intervalDays, sunlight, indoors, notes
  });
  res.status(201).json({ item });
});
app.put('/api/items/:id', requireAuth, async (req, res) => {
  const user = await currentUser(req);
  const doc = await Item.findOne({ _id: req.params.id, userId: user._id });
  if (!doc) return res.status(404).json({ error: 'not found' });
  const { name, species, lastWatered, intervalDays, sunlight, indoors, notes } = req.body;
  Object.assign(doc, { name, species, lastWatered, intervalDays, sunlight, indoors, notes });
  await doc.save();
  res.json({ item: doc });
});
app.delete('/api/items/:id', requireAuth, async (req, res) => {
  const user = await currentUser(req);
  const r = await Item.deleteOne({ _id: req.params.id, userId: user._id });
  if (r.deletedCount === 0) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// serve the react build files in prod
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'dist');
  app.use(express.static(buildPath));

  // otherwise, index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'server error' });
});

app.listen(PORT, () => {
  console.log(`A4 server listening on http://localhost:${PORT}`);
});
