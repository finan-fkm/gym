import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { 
  initDb, 
  getClients, 
  saveClient, 
  deleteClient, 
  getAdmin, 
  saveAdmin,
  closeDb
} from './db.js';
import { initialClients } from './seedData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable HTTP request logging
app.use(morgan('short'));

// Enable CORS for frontend integration
app.use(cors({
  origin: '*', // Allow all origins for easy API usage on Render
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 authentication requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Auto-seed database if empty on server start
const autoSeed = async () => {
  try {
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
    }
  } catch (err) {
    console.error('Auto-seed check error (non-fatal):', err);
  }
};

// Initialize Database before starting the server
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


// Helper to normalize usernames for queries (removes @ and converts to lowercase)
const normalizeUsername = (username) => {
  if (!username) return '';
  const val = username.trim().toLowerCase();
  return val.startsWith('@') ? val.slice(1) : val;
};

// Route: Root & Health Check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Fit By Shahid API is running', time: new Date() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Route: Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { role, username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const cleanUser = normalizeUsername(username);

  try {
    if (role === 'admin') {
      const admin = await getAdmin(cleanUser);
      if (admin && await bcrypt.compare(password, admin.passwordHash)) {
        return res.json({ 
          success: true, 
          user: { name: 'Coach Brandon', username: '@brandon', role: 'admin' } 
        });
      }
      return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
    } else {
      const clients = await getClients();
      const client = clients.find(c => normalizeUsername(c.username) === cleanUser);

      if (!client) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }

      if (!client.passwordCreated) {
        return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
      }

      if (client.status === 'Inactive') {
        return res.status(403).json({ 
          success: false, 
          message: 'Your account is currently inactive. Please contact the gym administrator.' 
        });
      }

      if (await bcrypt.compare(password, client.passwordHash)) {
        return res.json({
          success: true,
          user: { name: client.name, username: client.username, role: 'client', clientId: client.id }
        });
      }

      return res.status(401).json({ success: false, message: 'Incorrect username or password.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// Route: Verify Client Username
app.post('/api/auth/verify-username', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required.' });
  }

  const cleanUser = normalizeUsername(username);

  try {
    const clients = await getClients();
    const client = clients.find(c => normalizeUsername(c.username) === cleanUser);

    if (!client) {
      return res.json({ 
        success: false, 
        code: 'NOT_FOUND', 
        message: 'Username not found. Please check your username or contact the gym administrator.' 
      });
    }

    if (client.passwordCreated) {
      return res.json({ 
        success: false, 
        code: 'ALREADY_REGISTERED', 
        message: 'This account is already registered. Please login instead.' 
      });
    }

    if (client.status === 'Inactive') {
      return res.json({ 
        success: false, 
        code: 'INACTIVE', 
        message: 'Your account is currently inactive. Please contact the gym administrator.' 
      });
    }

    return res.json({ success: true, client: { id: client.id, name: client.name, username: client.username } });
  } catch (err) {
    console.error('Username verification error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// Route: Register Client Password
app.post('/api/auth/register-password', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const cleanUser = normalizeUsername(username);

  try {
    const clients = await getClients();
    const client = clients.find(c => normalizeUsername(c.username) === cleanUser);

    if (!client) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    client.passwordCreated = true;
    client.passwordHash = hashed;

    await saveClient(client);
    res.json({ success: true });
  } catch (err) {
    console.error('Register password error:', err);
    res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// Route: Get All Clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await getClients();
    // Exclude password hashes from response for security
    const sanitized = clients.map(({ passwordHash: _hash, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: 'Failed to fetch clients.' });
  }
});

// Route: Save or Create Client
app.post('/api/clients', async (req, res) => {
  const client = req.body;
  if (!client || !client.id) {
    return res.status(400).json({ error: 'Valid client data with an ID is required.' });
  }

  try {
    // Check if username is taken by another client
    const cleanUser = normalizeUsername(client.username);
    const clients = await getClients();
    const conflict = clients.find(c => c.id !== client.id && normalizeUsername(c.username) === cleanUser);
    
    if (conflict) {
      return res.status(409).json({ error: 'A client with this username already exists.' });
    }

    await saveClient(client);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: 'Failed to save client.' });
  }
});

// Route: Update Client
app.put('/api/clients/:id', async (req, res) => {
  const clientId = req.params.id;
  const updatedClient = req.body;

  if (!updatedClient || updatedClient.id !== clientId) {
    return res.status(400).json({ error: 'Invalid client update payload.' });
  }

  try {
    // Preserve existing password settings if not sent in the update payload
    const clients = await getClients();
    const existing = clients.find(c => c.id === clientId);
    if (existing) {
      if (updatedClient.passwordCreated === undefined) updatedClient.passwordCreated = existing.passwordCreated;
      if (updatedClient.passwordHash === undefined) updatedClient.passwordHash = existing.passwordHash;
    }

    await saveClient(updatedClient);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update client.' });
  }
});

// Route: Delete Client
app.delete('/api/clients/:id', async (req, res) => {
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
