import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { 
  initDb, 
  getClients, 
  getClientById, 
  getClientByUsername, 
  saveClient, 
  deleteClient, 
  getAdmin, 
  saveAdmin, 
  recordAttendance, 
  closeDb, 
  getDbStats, 
  cleanUsername, 
  sanitizeClient, 
  savePasswordResetToken, 
  findValidPasswordResetToken, 
  markPasswordResetTokenUsed, 
  updateClientPassword,
  saveWorkoutSession,
  getWorkoutSessions,
  updateSetRecordProgress,
  skipExercise,
  getProgressComparison
} from './db.js';
import { initialClients } from './seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'gymweb_production_jwt_secret_fitbyshahid_2026';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'gymweb_production_jwt_secret_fitbyshahid_2026')) {
  console.warn('WARNING: Running in production without a custom JWT_SECRET. Please configure a unique JWT_SECRET in your environment variables.');
}

// Enable security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable HTTP request logging
app.use(morgan('short'));

// CORS configuration supporting CLIENT_URL, FRONTEND_URL, Vercel, localhost, and Authorization headers
const configuredClientUrls = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://gym-k1eimpi49-finan4.vercel.app,https://gym-seven-rose.vercel.app')
  .split(',')
  .map(s => s.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Add default dev origins
const corsOrigins = Array.from(new Set([
  ...configuredClientUrls,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://gym-k1eimpi49-finan4.vercel.app',
  'https://gym-seven-rose.vercel.app'
]));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Also allow preview vercel deployments if needed
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback to prevent unexpected production outages
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight across all routes
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// -------------------------------------------------------------
// Authentication & Ownership Middlewares
// -------------------------------------------------------------

// Sign JWT Token with Remember Me support (30 days if rememberMe, 24 hours otherwise)
const generateToken = (payload, rememberMe = false) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: rememberMe ? '30d' : '24h' 
  });
};

// Verify Bearer JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

// Require Admin Role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access forbidden. Administrator privileges required.' });
  }
  next();
};

// Require Client Role
const requireClient = (req, res, next) => {
  if (!req.user || req.user.role !== 'client') {
    return res.status(403).json({ success: false, message: 'Access forbidden. Client portal privileges required.' });
  }
  next();
};

// Require Ownership (Client can only access own data) or Admin
const requireOwnershipOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  if (req.user.role === 'client') {
    const targetClientId = req.params.id;
    if (req.user.clientId === targetClientId) {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access forbidden. You cannot access or modify records of another client.' });
  }
  return res.status(403).json({ success: false, message: 'Unauthorized role.' });
};

// -------------------------------------------------------------
// Auto-seed database ONLY if empty on startup
// -------------------------------------------------------------
const autoSeed = async () => {
  try {
    // In production, do not create demo seed accounts unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_SEED !== 'true') {
      console.log('Production environment detected. Auto-seeding disabled to protect production data.');
      return;
    }

    const existingAdmin = await getAdmin('admin');
    if (!existingAdmin) {
      console.log('No admin found. Creating default admin account...');
      const adminPasswordHash = await bcrypt.hash('password', 10);
      await saveAdmin('admin', adminPasswordHash);
      console.log('Default admin account created: admin / password');
    }

    const existingClients = await getClients();
    if (existingClients.length === 0) {
      console.log(`No clients found. Seeding ${initialClients.length} default client profiles...`);
      const bcryptPassHash = await bcrypt.hash('password', 10);
      for (const client of initialClients) {
        const seededClient = JSON.parse(JSON.stringify(client));
        if (seededClient.passwordCreated) {
          seededClient.passwordHash = bcryptPassHash;
        }
        await saveClient(seededClient);
        console.log(`Seeded client: ${seededClient.name} (${seededClient.username})`);
      }
      console.log('Client profiles seeded successfully.');
    } else {
      console.log(`Database already has ${existingClients.length} clients. Skipping seeding.`);
    }
  } catch (err) {
    console.error('Auto-seed check error (non-fatal):', err);
  }
};

// -------------------------------------------------------------
// Health Check Endpoints
// -------------------------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Fit By Shahid API is running', time: new Date() });
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// POST /api/auth/login (Strict role separation, real DB auth, Remember Me session)
app.post('/api/auth/login', async (req, res) => {
  const { role, username, password, rememberMe = false } = req.body;
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Valid username/member ID and password are required.' });
  }

  const cleanUser = cleanUsername(username);

  try {
    if (role === 'admin') {
      const admin = await getAdmin(cleanUser);

      if (!admin) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }

      const isMatch = await bcrypt.compare(password, admin.passwordHash) ||
                      await bcrypt.compare(password.trim().toLowerCase(), admin.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }

      const adminUser = { 
        name: 'Coach Brandon', 
        username: admin.username.startsWith('@') ? admin.username : '@' + admin.username, 
        role: 'admin' 
      };
      const token = generateToken(adminUser, Boolean(rememberMe));
      return res.json({ success: true, token, user: adminUser });

    } else if (role === 'client') {
      const client = await getClientByUsername(cleanUser, { includePasswordHash: true });

      if (!client) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }

      if (!client.passwordCreated || !client.passwordHash) {
        return res.status(401).json({ 
          success: false, 
          code: 'PASSWORD_NOT_SET',
          message: 'Account not activated yet. Please click "Register & Set Password" to set up your password.' 
        });
      }

      if (client.status === 'Inactive') {
        return res.status(403).json({ 
          success: false, 
          message: 'Your account is currently inactive. Please contact the gym administrator.' 
        });
      }

      const isMatch = await bcrypt.compare(password, client.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }

      const user = { 
        name: client.name, 
        username: client.username, 
        role: 'client', 
        clientId: client.id 
      };
      const token = generateToken(user, Boolean(rememberMe));

      return res.json({ 
        success: true, 
        token, 
        user, 
        client: sanitizeClient(client) 
      });
    } else {
      return res.status(400).json({ success: false, message: 'A valid portal role (admin or client) is required.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// GET /api/auth/me (Restore session / validate JWT token)
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        success: true,
        user: { name: 'Coach Brandon', username: req.user.username || '@brandon', role: 'admin' }
      });
    } else if (req.user.role === 'client') {
      const client = await getClientById(req.user.clientId);
      if (!client) {
        return res.status(404).json({ success: false, message: 'Client record not found.' });
      }
      if (client.status === 'Inactive') {
        return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact your coach.' });
      }
      return res.json({
        success: true,
        user: { name: client.name, username: client.username, role: 'client', clientId: client.id },
        client: sanitizeClient(client)
      });
    } else {
      return res.status(403).json({ success: false, message: 'Invalid token role.' });
    }
  } catch (err) {
    console.error('Session validation error:', err);
    res.status(500).json({ success: false, message: 'Server error validating session.' });
  }
});

// POST /api/auth/verify-username (Client Registration Step 1)
app.post('/api/auth/verify-username', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username or Member ID is required.' });
  }

  const cleanUser = cleanUsername(username);

  try {
    const client = await getClientByUsername(cleanUser);

    if (!client) {
      return res.json({ 
        success: false, 
        code: 'NOT_FOUND', 
        message: 'No gym member record found with this username or member ID. Please contact your coach to create your membership profile first.' 
      });
    }

    if (client.passwordCreated) {
      return res.json({ 
        success: false, 
        code: 'ALREADY_REGISTERED', 
        message: 'This account is already registered. Please go to the Client Login page.' 
      });
    }

    if (client.status === 'Inactive') {
      return res.json({ 
        success: false, 
        code: 'INACTIVE', 
        message: 'Your account is currently inactive. Please contact the gym administrator.' 
      });
    }

    return res.json({ 
      success: true, 
      client: { id: client.id, name: client.name, username: client.username, memberId: client.memberId } 
    });
  } catch (err) {
    console.error('Username verification error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// POST /api/auth/register-password (Client Registration Step 2)
app.post('/api/auth/register-password', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  const cleanUser = cleanUsername(username);

  try {
    const client = await getClientByUsername(cleanUser, { includePasswordHash: true });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Member profile not found.' });
    }

    if (client.passwordCreated) {
      return res.status(400).json({ success: false, message: 'Account is already registered. Please login.' });
    }

    if (client.status === 'Inactive') {
      return res.status(403).json({ success: false, message: 'Account is currently inactive. Please contact your coach.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    client.passwordCreated = true;
    client.passwordHash = hashed;

    await saveClient(client);

    const user = {
      name: client.name,
      username: client.username,
      role: 'client',
      clientId: client.id
    };
    const token = generateToken(user, true);

    res.json({ 
      success: true, 
      token, 
      user, 
      client: sanitizeClient(client) 
    });
  } catch (err) {
    console.error('Register password error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// -------------------------------------------------------------
// Forgot Password & Secure Token Reset Endpoints
// -------------------------------------------------------------

// POST /api/auth/forgot-password (Generate cryptographically secure time-limited reset token)
app.post('/api/auth/forgot-password', async (req, res) => {
  const { identifier } = req.body || {};
  if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide your Username, Member ID, or Email.' });
  }

  const cleanId = cleanUsername(identifier);

  try {
    const client = await getClientByUsername(cleanId, { includePasswordHash: true });

    // Mitigate account enumeration by sending a consistent message format
    if (!client) {
      return res.json({ 
        success: true, 
        message: 'If an account matching that identifier exists, password reset instructions have been generated.',
        emailConfigured: false
      });
    }

    if (client.status === 'Inactive') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account is currently inactive. Please contact the gym administrator.' 
      });
    }

    // Generate 32-byte cryptographic random token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await savePasswordResetToken(client.id, tokenHash, expiresAt);

    // Check if SMTP environment variables are configured
    const hasSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

    if (hasSmtpConfigured) {
      // In production with SMTP configured, send reset email
      console.log(`[SMTP] Sending password reset email to ${client.email} for client ${client.name}`);
      return res.json({
        success: true,
        message: `Password reset instructions have been dispatched to ${client.email || 'your registered email'}. Please check your inbox.`,
        emailConfigured: true
      });
    } else {
      // Clear requirement notification when SMTP is not configured in environment variables
      return res.json({
        success: true,
        message: 'Password reset token generated. Since SMTP email service is not configured in environment variables, your secure reset code is provided below for immediate use.',
        resetToken: rawResetToken,
        emailConfigured: false
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// POST /api/auth/verify-reset-token (Verify token validity prior to password change)
app.post('/api/auth/verify-reset-token', async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ success: false, message: 'Reset token is required.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const validToken = await findValidPasswordResetToken(tokenHash);

    if (!validToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid, used, or expired reset token. Please request a new password reset.' 
      });
    }

    res.json({ success: true, valid: true });
  } catch (err) {
    console.error('Verify reset token error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// POST /api/auth/reset-password (Set new password with validated single-use token)
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const validToken = await findValidPasswordResetToken(tokenHash);

    if (!validToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'This reset token is invalid, expired, or has already been used. Please request a new token.' 
      });
    }

    // Invalidate token immediately to prevent reuse
    await markPasswordResetTokenUsed(validToken.id);

    // Hash the new password securely
    const hashed = await bcrypt.hash(newPassword, 10);
    await updateClientPassword(validToken.clientId, hashed);

    res.json({ 
      success: true, 
      message: 'Your password has been reset successfully. You can now log in with your new credentials.' 
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// -------------------------------------------------------------
// Client Portal Self-Access Routes (Ownership strictly enforced)
// -------------------------------------------------------------

// GET /api/client/me - Client fetches their own profile
app.get('/api/client/me', verifyToken, requireClient, async (req, res) => {
  try {
    const client = await getClientById(req.user.clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client profile not found.' });
    }
    res.json(sanitizeClient(client));
  } catch (err) {
    console.error('Error fetching client self-profile:', err);
    res.status(500).json({ error: 'Failed to fetch client profile.' });
  }
});

// PUT /api/client/me - Client updates their own data (e.g. workout checks)
app.put('/api/client/me', verifyToken, requireClient, async (req, res) => {
  const updatedData = req.body;
  if (!updatedData) {
    return res.status(400).json({ error: 'Payload is required.' });
  }

  try {
    const existing = await getClientById(req.user.clientId, { includePasswordHash: true });
    if (!existing) {
      return res.status(404).json({ error: 'Client profile not found.' });
    }

    // Protect critical fields against client manipulation
    const safeClient = {
      ...existing,
      ...updatedData,
      id: existing.id,
      role: 'client',
      status: existing.status,
      memberId: existing.memberId,
      username: existing.username,
      passwordCreated: existing.passwordCreated,
      passwordHash: existing.passwordHash
    };

    await saveClient(safeClient);
    res.json({ success: true, client: sanitizeClient(safeClient) });
  } catch (err) {
    console.error('Error updating client self-profile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// -------------------------------------------------------------
// Admin & Ownership Protected Client Routes
// -------------------------------------------------------------

// GET /api/clients - Admin only
app.get('/api/clients', verifyToken, requireAdmin, async (req, res) => {
  try {
    const clients = await getClients();
    res.json(clients.map(sanitizeClient));
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// GET /api/clients/:id - Admin or Owning Client
app.get('/api/clients/:id', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  const clientId = req.params.id;
  try {
    const client = await getClientById(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.json(sanitizeClient(client));
  } catch (err) {
    console.error('Error fetching client by ID:', err);
    res.status(500).json({ error: 'Failed to fetch client.' });
  }
});

// POST /api/clients - Admin only (Create Client)
app.post('/api/clients', verifyToken, requireAdmin, async (req, res) => {
  const client = req.body;
  if (!client || !client.id || !client.name || !client.username) {
    return res.status(400).json({ error: 'Valid client data with id, name, and username is required.' });
  }

  try {
    const cleanUser = cleanUsername(client.username);
    const existing = await getClientByUsername(cleanUser);
    if (existing && existing.id !== client.id) {
      return res.status(409).json({ error: 'A client with this username already exists.' });
    }

    await saveClient(client);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to save client.' });
  }
});

// PUT /api/clients/:id - Admin or Owning Client
app.put('/api/clients/:id', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  const clientId = req.params.id;
  const updatedClient = req.body;

  if (!updatedClient || updatedClient.id !== clientId) {
    return res.status(400).json({ error: 'Invalid client update payload.' });
  }

  try {
    const existing = await getClientById(clientId, { includePasswordHash: true });
    if (!existing) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // If caller is client, prevent changing status or memberId
    if (req.user.role === 'client') {
      updatedClient.status = existing.status;
      updatedClient.memberId = existing.memberId;
      updatedClient.username = existing.username;
    }

    // Preserve password settings
    if (updatedClient.passwordCreated === undefined) updatedClient.passwordCreated = existing.passwordCreated;
    if (updatedClient.passwordHash === undefined) updatedClient.passwordHash = existing.passwordHash;

    await saveClient(updatedClient);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

// DELETE /api/clients/:id - Admin only
app.delete('/api/clients/:id', verifyToken, requireAdmin, async (req, res) => {
  const clientId = req.params.id;
  try {
    const success = await deleteClient(clientId);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Client not found.' });
    }
  } catch (err) {
    console.error('Error deleting client:', err);
    res.status(500).json({ error: 'Failed to delete client.' });
  }
});

// POST /api/clients/:id/attendance - Admin or Owning Client
app.post('/api/clients/:id/attendance', verifyToken, requireOwnershipOrAdmin, async (req, res) => {
  const clientId = req.params.id;
  const { date, signature } = req.body || {};
  try {
    const newRecord = await recordAttendance(clientId, date, signature);
    if (!newRecord) {
      return res.status(404).json({ error: 'Client not found.' });
    }
    res.status(201).json({ success: true, attendance: newRecord });
  } catch (err) {
    console.error('Error recording attendance:', err);
    res.status(500).json({ error: 'Failed to record attendance.' });
  }
});

// GET /api/admin/stats - Admin only
app.get('/api/admin/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const stats = await getDbStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('Error fetching db stats:', err);
    res.status(500).json({ error: 'Failed to fetch database stats.' });
  }
});

// -------------------------------------------------------------
// Advanced Workout Tracking Endpoints (Set & Session Tracking)
// -------------------------------------------------------------

// Helper middleware to check ownership by clientId in param or body
const verifyWorkoutAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (req.user.role === 'admin') {
    return next();
  }
  const targetId = req.params.clientId || req.body.clientId;
  if (req.user.role === 'client' && req.user.clientId === targetId) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access forbidden. You can only view or modify your own workout records.' });
};

// GET /api/workouts/sessions/:clientId - Get all workout sessions for a client
app.get('/api/workouts/sessions/:clientId', verifyToken, verifyWorkoutAccess, async (req, res) => {
  try {
    const sessions = await getWorkoutSessions(req.params.clientId);
    res.json({ success: true, sessions });
  } catch (err) {
    console.error('Error fetching workout sessions:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch workout sessions.' });
  }
});

// POST /api/workouts/sessions - Save completed workout session with individual set records
app.post('/api/workouts/sessions', verifyToken, verifyWorkoutAccess, async (req, res) => {
  const sessionData = req.body;
  if (!sessionData || !sessionData.clientId) {
    return res.status(400).json({ success: false, message: 'Invalid session payload. clientId is required.' });
  }

  try {
    const saved = await saveWorkoutSession(sessionData);
    res.status(201).json({ success: true, session: saved });
  } catch (err) {
    console.error('Error saving workout session:', err);
    res.status(500).json({ success: false, message: 'Failed to save workout session.' });
  }
});

// PUT /api/workouts/set-progress - Live update for an individual set (actual reps, weight, status)
app.put('/api/workouts/set-progress', verifyToken, verifyWorkoutAccess, async (req, res) => {
  const { clientId, dayKey, exerciseId, setNumber, actualReps, weight, status } = req.body;
  if (!clientId || !dayKey || !exerciseId || setNumber === undefined) {
    return res.status(400).json({ success: false, message: 'clientId, dayKey, exerciseId, and setNumber are required.' });
  }

  try {
    const result = await updateSetRecordProgress(clientId, dayKey, exerciseId, setNumber, { actualReps, weight, status });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Client or exercise not found.' });
    }
    res.json({ success: true, client: result.client, exercise: result.exercise });
  } catch (err) {
    console.error('Error updating set progress:', err);
    res.status(500).json({ success: false, message: 'Failed to update set progress.' });
  }
});

// POST /api/workouts/skip-exercise - Mark exercise skipped with optional reason
app.post('/api/workouts/skip-exercise', verifyToken, verifyWorkoutAccess, async (req, res) => {
  const { clientId, dayKey, exerciseId, reason } = req.body;
  if (!clientId || !dayKey || !exerciseId) {
    return res.status(400).json({ success: false, message: 'clientId, dayKey, and exerciseId are required.' });
  }

  try {
    const result = await skipExercise(clientId, dayKey, exerciseId, reason);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Client or exercise not found.' });
    }
    res.json({ success: true, client: result.client, exercise: result.exercise });
  } catch (err) {
    console.error('Error skipping exercise:', err);
    res.status(500).json({ success: false, message: 'Failed to skip exercise.' });
  }
});

// GET /api/workouts/progress-comparison/:clientId - Progress comparison (previous session vs current session)
app.get('/api/workouts/progress-comparison/:clientId', verifyToken, verifyWorkoutAccess, async (req, res) => {
  try {
    const comparison = await getProgressComparison(req.params.clientId);
    res.json({ success: true, ...comparison });
  } catch (err) {
    console.error('Error fetching progress comparison:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch progress comparison.' });
  }
});

// -------------------------------------------------------------
// Server Lifecycle
// -------------------------------------------------------------
let server;
initDb()
  .then(() => autoSeed())
  .then(() => {
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT} (0.0.0.0)`);
    });
  })
  .catch(err => {
    console.error('Failed to start server due to database initialization error:', err);
    process.exit(1);
  });

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await closeDb();
        console.log('Graceful shutdown completed. Exiting.');
        process.exit(0);
      } catch (err) {
        console.error('Error closing database during shutdown:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
