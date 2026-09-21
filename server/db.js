import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const isPostgres = !!process.env.DATABASE_URL;
let pool = null;
const JSON_DB_PATH = path.resolve('database.json');

// Memory cache for JSON file database fallback
let jsonDb = {
  clients: [],
  admins: []
};

// Helper to save JSON database to disk
const saveJsonDb = () => {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(jsonDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write JSON database file:', err);
  }
};

// Initialize DB schema
export const initDb = async () => {
  if (isPostgres) {
    console.log('DB Mode: PostgreSQL database detected.');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });

    try {
      // Create tables
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          member_id TEXT NOT NULL,
          data JSONB NOT NULL
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
          username TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL
        );
      `);
      console.log('PostgreSQL tables initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize PostgreSQL tables:', err);
      throw err;
    }
  } else {
    console.log('DB Mode: Local JSON file database detected.');
    // Check if database.json exists
    if (fs.existsSync(JSON_DB_PATH)) {
      try {
        const data = fs.readFileSync(JSON_DB_PATH, 'utf-8');
        jsonDb = JSON.parse(data);
        console.log('Loaded JSON database from:', JSON_DB_PATH);
      } catch (err) {
        console.warn('Failed to parse database.json. Initializing fresh JSON db.', err);
        saveJsonDb();
      }
    } else {
      console.log('Initializing new database.json file.');
      saveJsonDb();
    }
  }
};

// CRUD Operations

// Get all clients
export const getClients = async () => {
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT data FROM clients');
      return res.rows.map(row => row.data);
    } catch (err) {
      console.error('Error fetching clients from Postgres:', err);
      return [];
    }
  } else {
    return jsonDb.clients;
  }
};

// Save or Update Client
export const saveClient = async (client) => {
  if (!client || !client.id) return false;

  if (isPostgres) {
    try {
      const cleanUsername = client.username.toLowerCase().trim();
      await pool.query(`
        INSERT INTO clients (id, name, username, member_id, data)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) 
        DO UPDATE SET name = $2, username = $3, member_id = $4, data = $5
      `, [client.id, client.name, cleanUsername, client.memberId, client]);
      return true;
    } catch (err) {
      console.error('Error saving client to Postgres:', err);
      throw err;
    }
  } else {
    const idx = jsonDb.clients.findIndex(c => c.id === client.id);
    if (idx !== -1) {
      jsonDb.clients[idx] = client;
    } else {
      jsonDb.clients.push(client);
    }
    saveJsonDb();
    return true;
  }
};

// Delete Client
export const deleteClient = async (clientId) => {
  if (isPostgres) {
    try {
      await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
      return true;
    } catch (err) {
      console.error('Error deleting client from Postgres:', err);
      throw err;
    }
  } else {
    const initialLength = jsonDb.clients.length;
    jsonDb.clients = jsonDb.clients.filter(c => c.id !== clientId);
    if (jsonDb.clients.length !== initialLength) {
      saveJsonDb();
      return true;
    }
    return false;
  }
};

// Get Admin Credentials
export const getAdmin = async (username) => {
  const cleanUsername = username.toLowerCase().trim();
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT password_hash FROM admins WHERE username = $1', [cleanUsername]);
      if (res.rows.length > 0) {
        return { username: cleanUsername, passwordHash: res.rows[0].password_hash };
      }
      return null;
    } catch (err) {
      console.error('Error getting admin from Postgres:', err);
      return null;
    }
  } else {
    const admin = jsonDb.admins.find(a => a.username.toLowerCase().trim() === cleanUsername);
    return admin ? { username: admin.username, passwordHash: admin.password_hash } : null;
  }
};

// Save or Update Admin
export const saveAdmin = async (username, passwordHash) => {
  const cleanUsername = username.toLowerCase().trim();
  if (isPostgres) {
    try {
      await pool.query(`
        INSERT INTO admins (username, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (username)
        DO UPDATE SET password_hash = $2
      `, [cleanUsername, passwordHash]);
      return true;
    } catch (err) {
      console.error('Error saving admin to Postgres:', err);
      throw err;
    }
  } else {
    const idx = jsonDb.admins.findIndex(a => a.username.toLowerCase().trim() === cleanUsername);
    if (idx !== -1) {
      jsonDb.admins[idx].password_hash = passwordHash;
    } else {
      jsonDb.admins.push({ username: cleanUsername, password_hash: passwordHash });
    }
    saveJsonDb();
    return true;
  }
};

// Close database pool (useful for graceful shutdown)
export const closeDb = async () => {
  if (pool) {
    console.log('Closing PostgreSQL connection pool...');
    await pool.end();
    console.log('PostgreSQL connection pool closed.');
  }
};
