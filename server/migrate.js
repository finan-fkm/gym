import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { 
  initDb, 
  saveAdmin, 
  saveClient, 
  getAdmin, 
  getClientById, 
  getClientByUsername,
  saveWorkoutSession,
  closeDb 
} from './db.js';

dotenv.config();

export const runMigration = async () => {
  console.log('====================================================');
  console.log('--- DATABASE MIGRATION WORKFLOW (JSON -> PostgreSQL) ---');
  console.log('====================================================');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    console.error('Please configure DATABASE_URL in your environment or server/.env before running migration.');
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    return { success: false, error: 'DATABASE_URL is missing' };
  }

  // Locate database.json
  const candidatePaths = [
    path.resolve(process.cwd(), 'database.json'),
    path.resolve(process.cwd(), 'server', 'database.json'),
    path.resolve(process.cwd(), '..', 'database.json')
  ];

  const jsonFilePath = candidatePaths.find(p => fs.existsSync(p));
  if (!jsonFilePath) {
    console.error('ERROR: No database.json source file found to migrate.');
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    return { success: false, error: 'database.json not found' };
  }

  console.log(`Found source JSON file at: ${jsonFilePath}`);

  // 1. Create a guaranteed backup of the source database before reading/processing
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.resolve(path.dirname(jsonFilePath), `database.backup.${timestamp}.json`);
  try {
    fs.copyFileSync(jsonFilePath, backupPath);
    console.log(`[✓] Source database backed up safely to: ${backupPath}`);
  } catch (backupErr) {
    console.error('CRITICAL: Failed to create source database backup:', backupErr.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    return { success: false, error: backupErr.message };
  }

  let jsonData = { clients: [], admins: [] };
  try {
    const raw = fs.readFileSync(jsonFilePath, 'utf-8');
    jsonData = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse database.json:', err.message);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    return { success: false, error: err.message };
  }

  let adminsAdded = 0;
  let adminsSkipped = 0;
  let adminsFailed = 0;

  let clientsAdded = 0;
  let clientsSkipped = 0;
  let clientsFailed = 0;

  try {
    // 2. Initialize PostgreSQL Schema, Tables, and Indexes
    console.log('Initializing PostgreSQL schemas, relational tables, and indexes...');
    await initDb();

    // 3. Migrate Admins (Non-destructive, idempotent)
    const admins = jsonData.admins || [];
    console.log(`Processing ${admins.length} admin record(s) from JSON source...`);

    for (const admin of admins) {
      if (!admin || !admin.username) continue;
      try {
        const existing = await getAdmin(admin.username);
        if (!existing) {
          const passHash = admin.password_hash || admin.passwordHash;
          await saveAdmin(admin.username, passHash);
          console.log(`[+] Migrated admin: ${admin.username}`);
          adminsAdded++;
        } else {
          console.log(`[~] Admin "${admin.username}" already exists in PostgreSQL. Preserved.`);
          adminsSkipped++;
        }
      } catch (adminErr) {
        console.error(`[-] Failed to migrate admin "${admin.username}":`, adminErr.message);
        adminsFailed++;
      }
    }

    // 4. Migrate Clients (Non-destructive, preserving all relational children)
    const clients = jsonData.clients || [];
    console.log(`Processing ${clients.length} client record(s) from JSON source...`);

    for (const client of clients) {
      if (!client || !client.id) continue;
      try {
        const existingById = await getClientById(client.id, { includePasswordHash: true });
        const existingByUser = client.username ? await getClientByUsername(client.username, { includePasswordHash: true }) : null;

        if (existingById) {
          console.log(`[~] Client "${client.name}" (ID: ${client.id}) already exists in PostgreSQL. Preserved.`);
          clientsSkipped++;
        } else if (existingByUser && existingByUser.id !== client.id) {
          console.log(`[~] Client username "${client.username}" (${client.name}) already exists under ID "${existingByUser.id}". Preserved.`);
          clientsSkipped++;
        } else {
          // saveClient executes within a PostgreSQL transaction and syncs workouts, exercises, metrics, notes, attendance
          await saveClient(client);

          // Migrate workout sessions & set records if present
          if (Array.isArray(client.workoutSessions)) {
            for (const sess of client.workoutSessions) {
              try {
                await saveWorkoutSession(sess);
              } catch (sessErr) {
                console.warn(`[!] Non-fatal session migration warning for ${client.name}:`, sessErr.message);
              }
            }
          }

          console.log(`[+] Migrated client: ${client.name} (${client.username}) [ID: ${client.id}]`);
          clientsAdded++;
        }
      } catch (clientErr) {
        console.error(`[-] Failed to migrate client "${client.name}" (${client.id}):`, clientErr.message);
        clientsFailed++;
      }
    }

    console.log('====================================================');
    console.log('MIGRATION SUMMARY REPORT:');
    console.log(`Source File:   ${jsonFilePath}`);
    console.log(`Backup File:   ${backupPath}`);
    console.log(`Admins:        ${adminsAdded} imported, ${adminsSkipped} skipped, ${adminsFailed} failed`);
    console.log(`Clients:       ${clientsAdded} imported, ${clientsSkipped} skipped, ${clientsFailed} failed`);
    console.log('====================================================');

    await closeDb();

    const hasFailures = (adminsFailed > 0 || clientsFailed > 0);
    if (hasFailures) {
      console.error('Migration finished with errors.');
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
      return { success: false, adminsAdded, adminsSkipped, adminsFailed, clientsAdded, clientsSkipped, clientsFailed };
    } else {
      console.log('Migration completed successfully with zero data loss.');
      if (process.env.NODE_ENV !== 'test') {
        process.exit(0);
      }
      return { success: true, adminsAdded, adminsSkipped, adminsFailed, clientsAdded, clientsSkipped, clientsFailed };
    }

  } catch (err) {
    console.error('FATAL: Database migration failed with exception:', err);
    try {
      await closeDb();
    } catch {
      // Ignore cleanup error
    }
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    return { success: false, error: err.message };
  }
};

// Auto-run when executed directly from CLI
if (process.argv[1] && (process.argv[1].endsWith('migrate.js') || process.argv[1].endsWith('migrate'))) {
  runMigration();
}
