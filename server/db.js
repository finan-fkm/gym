import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export let isPostgres = Boolean(process.env.DATABASE_URL);
export let pool = null;

// Determine JSON DB paths (support running from root or server dir)
const getJsonPaths = () => {
  const paths = [
    path.resolve(process.cwd(), 'database.json'),
    path.resolve(process.cwd(), 'server', 'database.json'),
    path.resolve(process.cwd(), '..', 'database.json')
  ];
  return Array.from(new Set(paths.filter(p => fs.existsSync(p))));
};

const getPrimaryJsonPath = () => {
  const existing = getJsonPaths();
  if (existing.length > 0) return existing[0];
  const serverPath = path.resolve(process.cwd(), 'server', 'database.json');
  return fs.existsSync(path.dirname(serverPath)) ? serverPath : path.resolve(process.cwd(), 'database.json');
};

// In-memory cache for JSON storage
let jsonDb = {
  users: [],
  admins: [],
  clients: [],
  trainers: [],
  workoutPlans: [],
  workoutAssignments: [],
  exercises: [],
  exerciseAssignments: [],
  workoutSessions: [],
  workoutSets: [],
  attendance: [],
  membershipPlans: [],
  memberships: [],
  payments: [],
  notifications: [],
  passwordResetTokens: [],
  settings: {}
};

export const getJsonDb = () => jsonDb;

// Helper to save JSON database to all known disk locations to keep in sync
export const saveJsonDb = () => {
  try {
    const primary = getPrimaryJsonPath();
    const content = JSON.stringify(jsonDb, null, 2);
    fs.writeFileSync(primary, content, 'utf-8');

    // Also sync to other paths if they exist
    const otherPaths = getJsonPaths().filter(p => p !== primary);
    for (const p of otherPaths) {
      try {
        fs.writeFileSync(p, content, 'utf-8');
      } catch {
        // Ignore secondary write failures
      }
    }
  } catch (err) {
    console.error('Failed to write JSON database file:', err);
  }
};

// Normalize username for search: lowercase, trimmed, no leading @
export const cleanUsername = (username) => {
  if (!username) return '';
  const val = username.trim().toLowerCase();
  return val.startsWith('@') ? val.slice(1) : val;
};

// Strips sensitive password hash before exposing to consumers
export const sanitizeClient = (client) => {
  if (!client) return null;
  const { passwordHash: _hash, password_hash: _hash2, ...rest } = client;
  return rest;
};

// Initialize DB schema & pool
export const initDb = async () => {
  if (isPostgres) {
    console.log('DB Mode: PostgreSQL database detected via DATABASE_URL.');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL.includes('render.com') 
        ? false 
        : { rejectUnauthorized: false }
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client pool:', err);
    });

    // Test connection immediately
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('PostgreSQL connection verified successfully.');
    } catch (connErr) {
      console.error('⚠️ Could not establish connection to PostgreSQL using DATABASE_URL:', connErr.message);
      console.warn('Falling back to local resilient JSON database mode.');
      isPostgres = false;
      if (pool) {
        try { await pool.end(); } catch {}
        pool = null;
      }
    }
  }

  if (isPostgres) {
    try {
      // 1. Admins table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
          username TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. Clients table with relational core columns & raw_data document
      await pool.query(`
        CREATE TABLE IF NOT EXISTS clients (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          username TEXT NOT NULL UNIQUE,
          member_id TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          membership_plan TEXT,
          membership_start_date TEXT,
          membership_expiry_date TEXT,
          status TEXT DEFAULT 'Active',
          password_created BOOLEAN DEFAULT false,
          password_hash TEXT,
          location TEXT,
          client_since TEXT,
          height TEXT,
          photo TEXT,
          fitness_level TEXT,
          equipment_preference TEXT,
          goals JSONB DEFAULT '[]'::jsonb,
          next_session JSONB DEFAULT '{}'::jsonb,
          weekly_progress JSONB DEFAULT '[]'::jsonb,
          daily_workouts JSONB DEFAULT '{}'::jsonb,
          notes JSONB DEFAULT '[]'::jsonb,
          signin_history JSONB DEFAULT '[]'::jsonb,
          metrics_history JSONB DEFAULT '[]'::jsonb,
          metrics JSONB DEFAULT '[]'::jsonb,
          raw_data JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3. Workouts relational table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          day_key TEXT NOT NULL,
          name TEXT NOT NULL,
          duration TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 4. Exercises relational table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS exercises (
          id TEXT PRIMARY KEY,
          workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          sets INT,
          equipment TEXT,
          details TEXT,
          reps TEXT,
          weight TEXT,
          completed BOOLEAN DEFAULT false,
          superset_id TEXT,
          image TEXT
        );
      `);

      // 5. Body measurements table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS body_measurements (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          metric_key TEXT NOT NULL,
          name TEXT NOT NULL,
          current_val NUMERIC,
          unit TEXT,
          change_val NUMERIC,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 6. Metrics history table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS metrics_history (
          id SERIAL PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          date_label TEXT NOT NULL,
          weight NUMERIC,
          chest NUMERIC,
          waist NUMERIC,
          recorded_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 7. Trainer notes table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trainer_notes (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          date_label TEXT,
          timestamp_label TEXT,
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 8. Sessions schedule table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          date_label TEXT,
          time_label TEXT,
          location TEXT,
          status TEXT DEFAULT 'Scheduled'
        );
      `);

      // 9. Attendance check-ins table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          date_label TEXT NOT NULL,
          signature TEXT,
          signed_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 10. Password reset tokens table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 11. Users Authentication Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'CLIENT',
          status TEXT DEFAULT 'Active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 12. Trainers Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trainers (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          specialty TEXT,
          bio TEXT,
          photo TEXT,
          status TEXT DEFAULT 'Active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 13. Workout Plans Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workout_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          category TEXT,
          level TEXT DEFAULT 'Intermediate',
          trainer_id TEXT,
          duration_weeks INT DEFAULT 4,
          days_per_week INT DEFAULT 5,
          is_active BOOLEAN DEFAULT true,
          raw_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 14. Workout Assignments Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workout_assignments (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          plan_id TEXT,
          day_key TEXT NOT NULL,
          workout_name TEXT NOT NULL,
          duration TEXT DEFAULT '45 mins',
          notes TEXT,
          status TEXT DEFAULT 'assigned',
          assigned_by TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 15. Exercise Assignments Table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS exercise_assignments (
          id TEXT PRIMARY KEY,
          workout_assignment_id TEXT,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          exercise_id TEXT,
          name TEXT NOT NULL,
          sets INT DEFAULT 3,
          target_reps TEXT DEFAULT '10',
          suggested_weight_kg NUMERIC DEFAULT 0,
          order_index INT DEFAULT 0,
          superset_id TEXT,
          status TEXT DEFAULT 'Not Started',
          notes TEXT,
          image TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 16. Workout Sessions table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workout_sessions (
          id TEXT PRIMARY KEY,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          workout_id TEXT,
          day_key TEXT,
          workout_name TEXT,
          duration_seconds INT DEFAULT 0,
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ DEFAULT NOW(),
          status TEXT DEFAULT 'completed',
          summary JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 17. Set Records & Workout Sets tables
      await pool.query(`
        CREATE TABLE IF NOT EXISTS set_records (
          id TEXT PRIMARY KEY,
          session_id TEXT REFERENCES workout_sessions(id) ON DELETE CASCADE,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          workout_id TEXT,
          day_key TEXT,
          exercise_id TEXT NOT NULL,
          exercise_name TEXT NOT NULL,
          set_number INT NOT NULL,
          target_reps INT DEFAULT 10,
          actual_reps INT,
          weight_kg NUMERIC,
          status TEXT DEFAULT 'pending',
          completed_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS workout_sets (
          id TEXT PRIMARY KEY,
          session_id TEXT REFERENCES workout_sessions(id) ON DELETE CASCADE,
          client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
          workout_id TEXT,
          day_key TEXT,
          exercise_id TEXT NOT NULL,
          exercise_name TEXT NOT NULL,
          set_number INT NOT NULL,
          target_reps INT DEFAULT 10,
          actual_reps INT,
          weight_kg NUMERIC,
          status TEXT DEFAULT 'pending',
          completed_at TIMESTAMPTZ,
          notes TEXT
        );
      `);

      // 18. Membership Plans table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS membership_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price NUMERIC NOT NULL,
          duration_months INT NOT NULL DEFAULT 1,
          description TEXT,
          features JSONB DEFAULT '[]'::jsonb,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 19. Memberships table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS memberships (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          plan_id TEXT,
          plan_name TEXT NOT NULL,
          start_date DATE NOT NULL,
          expiry_date DATE NOT NULL,
          status TEXT DEFAULT 'Active',
          price NUMERIC NOT NULL DEFAULT 0,
          auto_renew BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 20. Payments table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          membership_id TEXT,
          amount NUMERIC NOT NULL,
          currency TEXT DEFAULT 'USD',
          payment_method TEXT DEFAULT 'Credit Card',
          payment_status TEXT DEFAULT 'Completed',
          transaction_id TEXT,
          invoice_number TEXT,
          payment_date TIMESTAMPTZ DEFAULT NOW(),
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 21. Notifications table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          link TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Indexes for performance
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_clients_username ON clients(username);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(client_id);
        CREATE INDEX IF NOT EXISTS idx_exercises_workout ON exercises(workout_id);
        CREATE INDEX IF NOT EXISTS idx_measurements_client ON body_measurements(client_id);
        CREATE INDEX IF NOT EXISTS idx_trainer_notes_client ON trainer_notes(client_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_client ON attendance(client_id);
        CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS idx_reset_client ON password_reset_tokens(client_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_client ON workout_sessions(client_id);
        CREATE INDEX IF NOT EXISTS idx_set_records_session ON set_records(session_id);
        CREATE INDEX IF NOT EXISTS idx_set_records_client ON set_records(client_id);
        CREATE INDEX IF NOT EXISTS idx_memberships_client ON memberships(client_id);
        CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_id);
      `);

      console.log('PostgreSQL relational tables and indexes initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize PostgreSQL tables:', err);
      console.warn('Falling back to local resilient JSON database mode.');
      isPostgres = false;
      if (pool) {
        try { await pool.end(); } catch {}
        pool = null;
      }
    }
  }

  if (!isPostgres) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('------------------------------------------------------------------------');
      console.warn('⚠️  NOTICE: Running in production with resilient local JSON storage.');
      console.warn('DATABASE_URL is not configured or PostgreSQL could not be reached.');
      console.warn('To enable PostgreSQL, set DATABASE_URL in your Render Environment settings.');
      console.warn('------------------------------------------------------------------------');
    } else {
      console.log('DB Mode: Local JSON file database detected.');
    }
    const primary = getPrimaryJsonPath();
    if (fs.existsSync(primary)) {
      try {
        const raw = fs.readFileSync(primary, 'utf-8');
        jsonDb = JSON.parse(raw);
        if (!Array.isArray(jsonDb.clients)) jsonDb.clients = [];
        if (!Array.isArray(jsonDb.admins)) jsonDb.admins = [];
        if (!Array.isArray(jsonDb.users)) jsonDb.users = [];
        if (!Array.isArray(jsonDb.trainers)) jsonDb.trainers = [];
        if (!Array.isArray(jsonDb.workoutPlans)) jsonDb.workoutPlans = [];
        if (!Array.isArray(jsonDb.workoutAssignments)) jsonDb.workoutAssignments = [];
        if (!Array.isArray(jsonDb.exercises)) jsonDb.exercises = [];
        if (!Array.isArray(jsonDb.exerciseAssignments)) jsonDb.exerciseAssignments = [];
        if (!Array.isArray(jsonDb.workoutSessions)) jsonDb.workoutSessions = [];
        if (!Array.isArray(jsonDb.workoutSets)) jsonDb.workoutSets = [];
        if (!Array.isArray(jsonDb.attendance)) jsonDb.attendance = [];
        if (!Array.isArray(jsonDb.membershipPlans)) jsonDb.membershipPlans = [];
        if (!Array.isArray(jsonDb.memberships)) jsonDb.memberships = [];
        if (!Array.isArray(jsonDb.payments)) jsonDb.payments = [];
        if (!Array.isArray(jsonDb.notifications)) jsonDb.notifications = [];
        if (!Array.isArray(jsonDb.passwordResetTokens)) jsonDb.passwordResetTokens = [];
        if (!jsonDb.settings || typeof jsonDb.settings !== 'object') jsonDb.settings = {};
        console.log(`Loaded JSON database from: ${primary} (${jsonDb.clients.length} clients, ${jsonDb.admins.length} admins)`);
      } catch (err) {
        console.warn('Failed to parse database.json. Initializing fresh JSON db structure.', err);
        jsonDb = { clients: [], admins: [], users: [], trainers: [], workoutPlans: [], workoutAssignments: [], exercises: [], exerciseAssignments: [], workoutSessions: [], workoutSets: [], attendance: [], membershipPlans: [], memberships: [], payments: [], notifications: [], passwordResetTokens: [], settings: {} };
        saveJsonDb();
      }
    } else {
      console.log('Creating initial database.json file.');
      jsonDb = { clients: [], admins: [], users: [], trainers: [], workoutPlans: [], workoutAssignments: [], exercises: [], exerciseAssignments: [], workoutSessions: [], workoutSets: [], attendance: [], membershipPlans: [], memberships: [], payments: [], notifications: [], passwordResetTokens: [], settings: {} };
      saveJsonDb();
    }
  }
};

// Map Postgres row to unified client object
const formatPostgresClient = (row, includePasswordHash = false) => {
  if (!row) return null;
  const baseData = row.raw_data || {};
  const formatted = {
    ...baseData,
    id: row.id,
    name: row.name,
    username: row.username,
    memberId: row.member_id || baseData.memberId,
    phone: row.phone || baseData.phone,
    email: row.email || baseData.email,
    membershipPlan: row.membership_plan || baseData.membershipPlan,
    membershipStartDate: row.membership_start_date || baseData.membershipStartDate,
    membershipExpiryDate: row.membership_expiry_date || baseData.membershipExpiryDate,
    status: row.status || baseData.status || 'Active',
    passwordCreated: Boolean(row.password_created ?? baseData.passwordCreated),
    location: row.location || baseData.location,
    clientSince: row.client_since || baseData.clientSince,
    height: row.height || baseData.height,
    photo: row.photo || baseData.photo,
    fitnessLevel: row.fitness_level || baseData.fitnessLevel,
    equipmentPreference: row.equipment_preference || baseData.equipmentPreference,
    goals: row.goals || baseData.goals || [],
    metrics: row.metrics || baseData.metrics || [],
    nextSession: row.next_session || baseData.nextSession || {},
    weeklyProgress: row.weekly_progress || baseData.weeklyProgress || [],
    dailyWorkouts: row.daily_workouts || baseData.dailyWorkouts || {},
    notes: row.notes || baseData.notes || [],
    signinHistory: row.signin_history || baseData.signinHistory || [],
    metricsHistory: row.metrics_history || baseData.metricsHistory || [],
    workoutSessions: baseData.workoutSessions || []
  };

  if (includePasswordHash) {
    formatted.passwordHash = row.password_hash || baseData.passwordHash;
  } else {
    delete formatted.passwordHash;
  }

  return formatted;
};

// Get All Clients
export const getClients = async ({ includePasswordHash = false } = {}) => {
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT * FROM clients ORDER BY created_at ASC');
      return res.rows.map(row => {
        const c = formatPostgresClient(row, includePasswordHash);
        return normalizeClientWorkouts(c);
      });
    } catch (err) {
      console.error('Error fetching clients from PostgreSQL:', err);
      throw err;
    }
  } else {
    return jsonDb.clients.map(c => {
      const norm = normalizeClientWorkouts(c);
      if (includePasswordHash) return { ...norm };
      return sanitizeClient(norm);
    });
  }
};

// Get Single Client by ID
export const getClientById = async (id, { includePasswordHash = false } = {}) => {
  if (!id) return null;
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const c = formatPostgresClient(res.rows[0], includePasswordHash);
      return normalizeClientWorkouts(c);
    } catch (err) {
      console.error('Error fetching client by ID from PostgreSQL:', err);
      throw err;
    }
  } else {
    const client = jsonDb.clients.find(c => c.id === id);
    if (!client) return null;
    const norm = normalizeClientWorkouts(client);
    return includePasswordHash ? { ...norm } : sanitizeClient(norm);
  }
};

// Get Single Client by Username or Member ID
export const getClientByUsername = async (username, { includePasswordHash = false } = {}) => {
  if (!username) return null;
  const target = cleanUsername(username);

  if (isPostgres) {
    try {
      const res = await pool.query(
        'SELECT * FROM clients WHERE LOWER(REPLACE(username, \'@\', \'\')) = $1 OR LOWER(member_id) = $1 OR LOWER(COALESCE(email, \'\')) = $1',
        [target]
      );
      if (res.rows.length === 0) return null;
      const c = formatPostgresClient(res.rows[0], includePasswordHash);
      return normalizeClientWorkouts(c);
    } catch (err) {
      console.error('Error fetching client by username from PostgreSQL:', err);
      throw err;
    }
  } else {
    const client = jsonDb.clients.find(c => 
      cleanUsername(c.username) === target || 
      (c.memberId && c.memberId.toLowerCase() === target) ||
      (c.email && c.email.toLowerCase() === target)
    );
    if (!client) return null;
    const norm = normalizeClientWorkouts(client);
    return includePasswordHash ? { ...norm } : sanitizeClient(norm);
  }
};

// Save or Update Client with full relational table synchronization inside a transaction
export const saveClient = async (client) => {
  if (!client || !client.id) return false;

  if (isPostgres) {
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      // Retain existing password hash if none supplied in client object
      let passwordHash = client.passwordHash;
      if (!passwordHash) {
        const existing = await dbClient.query('SELECT password_hash FROM clients WHERE id = $1', [client.id]);
        if (existing.rows.length > 0) {
          passwordHash = existing.rows[0].password_hash;
        }
      }

      const clientToStore = { ...client };
      if (passwordHash) clientToStore.passwordHash = passwordHash;

      // 1. Upsert into core clients table
      await dbClient.query(`
        INSERT INTO clients (
          id, name, username, member_id, phone, email,
          membership_plan, membership_start_date, membership_expiry_date,
          status, password_created, password_hash, location, client_since,
          height, photo, fitness_level, equipment_preference,
          goals, next_session, weekly_progress, daily_workouts,
          notes, signin_history, metrics_history, metrics,
          raw_data, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25, $26,
          $27, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          member_id = EXCLUDED.member_id,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          membership_plan = EXCLUDED.membership_plan,
          membership_start_date = EXCLUDED.membership_start_date,
          membership_expiry_date = EXCLUDED.membership_expiry_date,
          status = EXCLUDED.status,
          password_created = EXCLUDED.password_created,
          password_hash = COALESCE(EXCLUDED.password_hash, clients.password_hash),
          location = EXCLUDED.location,
          client_since = EXCLUDED.client_since,
          height = EXCLUDED.height,
          photo = EXCLUDED.photo,
          fitness_level = EXCLUDED.fitness_level,
          equipment_preference = EXCLUDED.equipment_preference,
          goals = EXCLUDED.goals,
          next_session = EXCLUDED.next_session,
          weekly_progress = EXCLUDED.weekly_progress,
          daily_workouts = EXCLUDED.daily_workouts,
          notes = EXCLUDED.notes,
          signin_history = EXCLUDED.signin_history,
          metrics_history = EXCLUDED.metrics_history,
          metrics = EXCLUDED.metrics,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW();
      `, [
        client.id,
        client.name,
        client.username,
        client.memberId || '',
        client.phone || '',
        client.email || '',
        client.membershipPlan || 'Gold Monthly',
        client.membershipStartDate || '',
        client.membershipExpiryDate || '',
        client.status || 'Active',
        Boolean(client.passwordCreated),
        passwordHash || null,
        client.location || '',
        client.clientSince || '',
        client.height || '',
        client.photo || '/images/therese.webp',
        client.fitnessLevel || 'Moderate',
        client.equipmentPreference || 'Free Weights',
        JSON.stringify(client.goals || []),
        JSON.stringify(client.nextSession || {}),
        JSON.stringify(client.weeklyProgress || []),
        JSON.stringify(client.dailyWorkouts || {}),
        JSON.stringify(client.notes || []),
        JSON.stringify(client.signinHistory || []),
        JSON.stringify(client.metricsHistory || []),
        JSON.stringify(client.metrics || []),
        JSON.stringify(clientToStore)
      ]);

      // 2. Synchronize relational workouts & exercises
      if (client.dailyWorkouts && typeof client.dailyWorkouts === 'object') {
        for (const [dayKey, workout] of Object.entries(client.dailyWorkouts)) {
          if (!workout) continue;
          const workoutId = `${client.id}_${dayKey}`;
          await dbClient.query(`
            INSERT INTO workouts (id, client_id, day_key, name, duration, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              duration = EXCLUDED.duration;
          `, [workoutId, client.id, dayKey, workout.name || 'Daily Workout', workout.duration || '30 mins']);

          if (Array.isArray(workout.exercises)) {
            for (const ex of workout.exercises) {
              if (!ex || !ex.id) continue;
              await dbClient.query(`
                INSERT INTO exercises (
                  id, workout_id, client_id, name, sets, equipment,
                  details, reps, weight, completed, superset_id, image
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  sets = EXCLUDED.sets,
                  equipment = EXCLUDED.equipment,
                  details = EXCLUDED.details,
                  reps = EXCLUDED.reps,
                  weight = EXCLUDED.weight,
                  completed = EXCLUDED.completed,
                  superset_id = EXCLUDED.superset_id,
                  image = EXCLUDED.image;
              `, [
                ex.id,
                workoutId,
                client.id,
                ex.name || 'Exercise',
                parseInt(ex.sets, 10) || 3,
                ex.equipment || '',
                ex.details || '',
                ex.reps || '',
                ex.weight || '',
                Boolean(ex.completed),
                ex.supersetId || null,
                ex.image || '/images/exercise_squat.webp'
              ]);
            }
          }
        }
      }

      // 3. Synchronize relational body measurements
      if (Array.isArray(client.metrics)) {
        for (const m of client.metrics) {
          if (!m || !m.id) continue;
          const measurementId = `${client.id}_${m.id}`;
          await dbClient.query(`
            INSERT INTO body_measurements (id, client_id, metric_key, name, current_val, unit, change_val, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              current_val = EXCLUDED.current_val,
              unit = EXCLUDED.unit,
              change_val = EXCLUDED.change_val,
              updated_at = NOW();
          `, [
            measurementId,
            client.id,
            m.id,
            m.name || m.id,
            parseFloat(m.current) || 0,
            m.unit || 'in',
            parseFloat(m.change) || 0
          ]);
        }
      }

      // 4. Synchronize relational trainer notes
      if (Array.isArray(client.notes)) {
        for (const note of client.notes) {
          if (!note || !note.id) continue;
          await dbClient.query(`
            INSERT INTO trainer_notes (id, client_id, date_label, timestamp_label, text, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (id) DO UPDATE SET
              date_label = EXCLUDED.date_label,
              timestamp_label = EXCLUDED.timestamp_label,
              text = EXCLUDED.text;
          `, [
            note.id,
            client.id,
            note.date || 'Today',
            note.timestamp || 'Today',
            note.text || ''
          ]);
        }
      }

      // 5. Synchronize relational attendance history
      if (Array.isArray(client.signinHistory)) {
        for (const signin of client.signinHistory) {
          if (!signin || !signin.id) continue;
          await dbClient.query(`
            INSERT INTO attendance (id, client_id, date_label, signature, signed_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (id) DO UPDATE SET
              date_label = EXCLUDED.date_label,
              signature = EXCLUDED.signature;
          `, [
            signin.id,
            client.id,
            signin.date || '',
            signin.signature || 'FIT_BY_SHAHID_'
          ]);
        }
      }

      await dbClient.query('COMMIT');
      return true;
    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Error saving client to PostgreSQL transaction:', err);
      throw err;
    } finally {
      dbClient.release();
    }
  } else {
    const idx = jsonDb.clients.findIndex(c => c.id === client.id);
    if (idx !== -1) {
      const existing = jsonDb.clients[idx];
      jsonDb.clients[idx] = {
        ...existing,
        ...client,
        passwordHash: client.passwordHash || existing.passwordHash
      };
    } else {
      jsonDb.clients.push({ ...client });
    }
    saveJsonDb();
    return true;
  }
};

// Record Attendance (Sign-in) for a client
export const recordAttendance = async (clientId, date, signature) => {
  if (!clientId) return null;
  const client = await getClientById(clientId, { includePasswordHash: true });
  if (!client) return null;

  const newSignin = {
    id: 's_' + Date.now(),
    date: date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
    signature: signature || 'FIT_BY_SHAHID_'
  };

  const updatedHistory = [newSignin, ...(client.signinHistory || [])];
  client.signinHistory = updatedHistory;

  await saveClient(client);
  return newSignin;
};

// Delete Client
export const deleteClient = async (clientId) => {
  if (!clientId) return false;

  if (isPostgres) {
    try {
      const res = await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
      return res.rowCount > 0;
    } catch (err) {
      console.error('Error deleting client from PostgreSQL:', err);
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
  if (!username) return null;
  const clean = cleanUsername(username);

  if (isPostgres) {
    try {
      const res = await pool.query('SELECT username, password_hash FROM admins WHERE LOWER(username) = $1', [clean]);
      if (res.rows.length > 0) {
        return { username: res.rows[0].username, passwordHash: res.rows[0].password_hash };
      }
      return null;
    } catch (err) {
      console.error('Error getting admin from PostgreSQL:', err);
      return null;
    }
  } else {
    const admin = jsonDb.admins.find(a => cleanUsername(a.username) === clean);
    return admin ? { username: admin.username, passwordHash: admin.password_hash } : null;
  }
};

// Save or Update Admin
export const saveAdmin = async (username, passwordHash) => {
  if (!username || !passwordHash) return false;
  const clean = cleanUsername(username);

  if (isPostgres) {
    try {
      await pool.query(`
        INSERT INTO admins (username, password_hash, created_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (username)
        DO UPDATE SET password_hash = $2
      `, [clean, passwordHash]);
      return true;
    } catch (err) {
      console.error('Error saving admin to PostgreSQL:', err);
      throw err;
    }
  } else {
    const idx = jsonDb.admins.findIndex(a => cleanUsername(a.username) === clean);
    if (idx !== -1) {
      jsonDb.admins[idx].password_hash = passwordHash;
    } else {
      jsonDb.admins.push({ username: clean, password_hash: passwordHash });
    }
    saveJsonDb();
    return true;
  }
};

// Get Database Status
export const getDbStats = async () => {
  if (isPostgres) {
    try {
      const cRes = await pool.query('SELECT COUNT(*) AS count FROM clients');
      const aRes = await pool.query('SELECT COUNT(*) AS count FROM admins');
      return {
        mode: 'postgresql',
        clientsCount: parseInt(cRes.rows[0].count, 10),
        adminsCount: parseInt(aRes.rows[0].count, 10)
      };
    } catch (err) {
      return { mode: 'postgresql', error: err.message };
    }
  } else {
    return {
      mode: 'json',
      clientsCount: jsonDb.clients.length,
      adminsCount: jsonDb.admins.length
    };
  }
};

// Close database pool (graceful shutdown)
export const closeDb = async () => {
  if (pool) {
    console.log('Closing PostgreSQL connection pool...');
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed.');
  }
};

// -------------------------------------------------------------
// Password Reset Token Helpers
// -------------------------------------------------------------

// Save a new password reset token (invalidates prior active tokens for this client)
export const savePasswordResetToken = async (clientId, tokenHash, expiresAt) => {
  if (!clientId || !tokenHash) return false;

  if (isPostgres) {
    try {
      await pool.query(
        'UPDATE password_reset_tokens SET used = true WHERE client_id = $1 AND used = false',
        [clientId]
      );
      const res = await pool.query(
        'INSERT INTO password_reset_tokens (client_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
        [clientId, tokenHash, expiresAt]
      );
      return res.rows[0]?.id || true;
    } catch (err) {
      console.error('Error saving password reset token in PostgreSQL:', err);
      throw err;
    }
  } else {
    if (!jsonDb.passwordResetTokens) jsonDb.passwordResetTokens = [];
    jsonDb.passwordResetTokens.forEach(t => {
      if (t.clientId === clientId) t.used = true;
    });
    const id = Date.now().toString();
    jsonDb.passwordResetTokens.push({
      id,
      clientId,
      tokenHash,
      expiresAt: new Date(expiresAt).toISOString(),
      used: false,
      createdAt: new Date().toISOString()
    });
    saveJsonDb();
    return id;
  }
};

// Find a valid, unexpired, unused reset token
export const findValidPasswordResetToken = async (tokenHash) => {
  if (!tokenHash) return null;

  if (isPostgres) {
    try {
      const res = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [tokenHash]
      );
      if (res.rows.length === 0) return null;
      return {
        id: res.rows[0].id,
        clientId: res.rows[0].client_id,
        tokenHash: res.rows[0].token_hash,
        expiresAt: res.rows[0].expires_at,
        used: res.rows[0].used
      };
    } catch (err) {
      console.error('Error checking password reset token in PostgreSQL:', err);
      throw err;
    }
  } else {
    if (!jsonDb.passwordResetTokens) return null;
    const now = new Date();
    const token = jsonDb.passwordResetTokens.find(t => 
      t.tokenHash === tokenHash && !t.used && new Date(t.expiresAt) > now
    );
    return token ? { ...token } : null;
  }
};

// Mark a password reset token as used
export const markPasswordResetTokenUsed = async (tokenId) => {
  if (!tokenId) return;

  if (isPostgres) {
    try {
      await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]);
    } catch (err) {
      console.error('Error marking reset token used in PostgreSQL:', err);
    }
  } else {
    if (!jsonDb.passwordResetTokens) return;
    const t = jsonDb.passwordResetTokens.find(tok => tok.id === tokenId);
    if (t) {
      t.used = true;
      saveJsonDb();
    }
  }
};

// Update client password directly
export const updateClientPassword = async (clientId, passwordHash) => {
  if (!clientId || !passwordHash) return false;

  if (isPostgres) {
    try {
      await pool.query(
        'UPDATE clients SET password_hash = $1, password_created = true, updated_at = NOW() WHERE id = $2',
        [passwordHash, clientId]
      );
      return true;
    } catch (err) {
      console.error('Error updating client password in PostgreSQL:', err);
      throw err;
    }
  } else {
    const client = jsonDb.clients.find(c => c.id === clientId);
    if (client) {
      client.passwordHash = passwordHash;
      client.passwordCreated = true;
      saveJsonDb();
      return true;
    }
    return false;
  }
};

// =============================================================
// Advanced Workout Tracking: Normalization, Sets & Sessions
// =============================================================

export const normalizeExercise = (ex) => {
  if (!ex) return ex;
  const setsCount = Math.max(1, parseInt(ex.sets, 10) || 3);
  let parsedTargetReps = 10;
  if (ex.targetReps !== undefined && ex.targetReps !== null && ex.targetReps !== '') {
    parsedTargetReps = parseInt(ex.targetReps, 10) || 10;
  } else if (ex.reps) {
    const match = String(ex.reps).match(/\d+/);
    if (match) parsedTargetReps = parseInt(match[0], 10) || 10;
  }

  let parsedWeight = null;
  const isBw = ex.isBodyweight !== undefined 
    ? Boolean(ex.isBodyweight)
    : (
        String(ex.equipment || '').toLowerCase().includes('bodyweight') ||
        String(ex.weight || '').toLowerCase().includes('bodyweight') ||
        String(ex.weight || '').toLowerCase().includes('bw')
      );

  if (!isBw) {
    if (ex.suggestedWeight !== undefined && ex.suggestedWeight !== null && ex.suggestedWeight !== '') {
      parsedWeight = parseFloat(ex.suggestedWeight) || 0;
    } else if (ex.weight) {
      const match = String(ex.weight).match(/\d+(\.\d+)?/);
      if (match) parsedWeight = parseFloat(match[0]) || 10;
    }
  }

  const existingSets = Array.isArray(ex.setRecords) ? ex.setRecords : [];
  const setRecords = [];
  for (let i = 1; i <= setsCount; i++) {
    const existing = existingSets.find(s => s.setNumber === i);
    if (existing) {
      setRecords.push({
        setNumber: i,
        targetReps: existing.targetReps !== undefined ? existing.targetReps : parsedTargetReps,
        actualReps: existing.actualReps !== undefined ? existing.actualReps : (ex.completed ? (existing.targetReps ?? parsedTargetReps) : null),
        weight: existing.weight !== undefined ? existing.weight : (isBw ? null : parsedWeight),
        status: existing.status || (ex.completed ? 'completed' : 'pending'),
        completedAt: existing.completedAt || (ex.completed ? new Date().toISOString() : null)
      });
    } else {
      setRecords.push({
        setNumber: i,
        targetReps: parsedTargetReps,
        actualReps: ex.completed ? parsedTargetReps : null,
        weight: isBw ? null : parsedWeight,
        status: ex.completed ? 'completed' : 'pending',
        completedAt: ex.completed ? new Date().toISOString() : null
      });
    }
  }

  let status = ex.status;
  if (!status) {
    if (ex.completed) {
      status = 'completed';
    } else {
      const completedOrSkipped = setRecords.filter(s => s.status === 'completed' || s.status === 'skipped').length;
      if (completedOrSkipped === 0) status = 'not_started';
      else if (completedOrSkipped === setRecords.length) {
        const completedCount = setRecords.filter(s => s.status === 'completed').length;
        status = completedCount > 0 ? 'completed' : 'skipped';
      } else status = 'in_progress';
    }
  }

  const isCompleted = status === 'completed' || (setRecords.length > 0 && setRecords.every(s => s.status === 'completed' || s.status === 'skipped') && status !== 'skipped');

  return {
    ...ex,
    sets: setsCount,
    targetReps: parsedTargetReps,
    suggestedWeight: parsedWeight,
    isBodyweight: isBw,
    status,
    completed: isCompleted,
    skipReason: ex.skipReason || '',
    setRecords
  };
};

export const normalizeClientWorkouts = (client) => {
  if (!client) return client;
  const clone = JSON.parse(JSON.stringify(client));
  if (clone.dailyWorkouts && typeof clone.dailyWorkouts === 'object') {
    const updatedWorkouts = {};
    for (const [dayKey, workout] of Object.entries(clone.dailyWorkouts)) {
      if (!workout) {
        updatedWorkouts[dayKey] = workout;
        continue;
      }
      const updatedExercises = Array.isArray(workout.exercises)
        ? workout.exercises.map(normalizeExercise)
        : [];
      updatedWorkouts[dayKey] = {
        ...workout,
        exercises: updatedExercises
      };
    }
    clone.dailyWorkouts = updatedWorkouts;
  }
  if (!Array.isArray(clone.workoutSessions)) {
    clone.workoutSessions = [];
  }
  return clone;
};

// Save completed or logged workout session
export const saveWorkoutSession = async (sessionData) => {
  if (!sessionData || !sessionData.clientId) return null;
  const sessionId = sessionData.id || `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const completedAt = sessionData.completedAt || new Date().toISOString();
  const startedAt = sessionData.startedAt || new Date(Date.now() - (sessionData.durationSeconds || 1800) * 1000).toISOString();

  const formattedSession = {
    id: sessionId,
    clientId: sessionData.clientId,
    workoutId: sessionData.workoutId || `${sessionData.clientId}_${sessionData.dayKey || 'workout'}`,
    dayKey: sessionData.dayKey || 'custom',
    workoutName: sessionData.workoutName || 'Workout Session',
    durationSeconds: sessionData.durationSeconds || 0,
    startedAt,
    completedAt,
    status: sessionData.status || 'completed',
    summary: sessionData.summary || {},
    setRecords: sessionData.setRecords || []
  };

  if (isPostgres) {
    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');
      await dbClient.query(`
        INSERT INTO workout_sessions (
          id, client_id, workout_id, day_key, workout_name,
          duration_seconds, started_at, completed_at, status, summary, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (id) DO UPDATE SET
          duration_seconds = EXCLUDED.duration_seconds,
          completed_at = EXCLUDED.completed_at,
          status = EXCLUDED.status,
          summary = EXCLUDED.summary;
      `, [
        formattedSession.id,
        formattedSession.clientId,
        formattedSession.workoutId,
        formattedSession.dayKey,
        formattedSession.workoutName,
        formattedSession.durationSeconds,
        formattedSession.startedAt,
        formattedSession.completedAt,
        formattedSession.status,
        JSON.stringify(formattedSession.summary)
      ]);

      if (Array.isArray(formattedSession.setRecords)) {
        for (const sr of formattedSession.setRecords) {
          const srId = sr.id || `sr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          await dbClient.query(`
            INSERT INTO set_records (
              id, session_id, client_id, workout_id, day_key, exercise_id, exercise_name,
              set_number, target_reps, actual_reps, weight_kg, status, completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (id) DO UPDATE SET
              actual_reps = EXCLUDED.actual_reps,
              weight_kg = EXCLUDED.weight_kg,
              status = EXCLUDED.status,
              completed_at = EXCLUDED.completed_at;
          `, [
            srId,
            formattedSession.id,
            formattedSession.clientId,
            formattedSession.workoutId,
            formattedSession.dayKey,
            sr.exerciseId || sr.id || 'ex',
            sr.exerciseName || 'Exercise',
            sr.setNumber || 1,
            sr.targetReps || 10,
            sr.actualReps !== undefined ? sr.actualReps : null,
            sr.weight !== undefined && sr.weight !== null ? parseFloat(sr.weight) : null,
            sr.status || 'completed',
            sr.completedAt || completedAt
          ]);
        }
      }

      await dbClient.query('COMMIT');
    } catch (err) {
      await dbClient.query('ROLLBACK');
      console.error('Error saving workout session in PostgreSQL:', err);
      throw err;
    } finally {
      dbClient.release();
    }
  }

  // Synchronize into client object for fast caching and offline resilience
  const client = await getClientById(formattedSession.clientId, { includePasswordHash: true });
  if (client) {
    if (!Array.isArray(client.workoutSessions)) client.workoutSessions = [];
    const existingIdx = client.workoutSessions.findIndex(s => s.id === formattedSession.id);
    if (existingIdx >= 0) {
      client.workoutSessions[existingIdx] = formattedSession;
    } else {
      client.workoutSessions.unshift(formattedSession);
    }
    await saveClient(client);
  }

  return formattedSession;
};

// Fetch workout sessions for client
export const getWorkoutSessions = async (clientId) => {
  if (!clientId) return [];
  if (isPostgres) {
    try {
      const res = await pool.query(
        'SELECT * FROM workout_sessions WHERE client_id = $1 ORDER BY completed_at DESC',
        [clientId]
      );
      const sessions = [];
      for (const row of res.rows) {
        const setRes = await pool.query(
          'SELECT * FROM set_records WHERE session_id = $1 ORDER BY set_number ASC',
          [row.id]
        );
        sessions.push({
          id: row.id,
          clientId: row.client_id,
          workoutId: row.workout_id,
          dayKey: row.day_key,
          workoutName: row.workout_name,
          durationSeconds: row.duration_seconds,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          status: row.status,
          summary: row.summary || {},
          setRecords: setRes.rows.map(sr => ({
            id: sr.id,
            sessionId: sr.session_id,
            clientId: sr.client_id,
            exerciseId: sr.exercise_id,
            exerciseName: sr.exercise_name,
            setNumber: sr.set_number,
            targetReps: sr.target_reps,
            actualReps: sr.actual_reps,
            weight: sr.weight_kg !== null ? parseFloat(sr.weight_kg) : null,
            status: sr.status,
            completedAt: sr.completed_at
          }))
        });
      }
      return sessions;
    } catch (err) {
      console.error('Error fetching workout sessions from PostgreSQL:', err);
      throw err;
    }
  } else {
    const client = jsonDb.clients.find(c => c.id === clientId);
    if (!client) return [];
    return Array.isArray(client.workoutSessions) ? client.workoutSessions : [];
  }
};

// Update an individual set record in real-time
export const updateSetRecordProgress = async (clientId, dayKey, exerciseId, setNumber, { actualReps, weight, status }) => {
  const client = await getClientById(clientId, { includePasswordHash: true });
  if (!client) return null;
  const normalized = normalizeClientWorkouts(client);
  const workout = normalized.dailyWorkouts[dayKey];
  if (!workout || !Array.isArray(workout.exercises)) return null;

  const exercise = workout.exercises.find(e => e.id === exerciseId);
  if (!exercise) return null;

  if (!Array.isArray(exercise.setRecords)) {
    exercise.setRecords = [];
  }

  const num = parseInt(setNumber, 10);
  let setRec = exercise.setRecords.find(s => s.setNumber === num);
  if (!setRec) {
    setRec = {
      setNumber: num,
      targetReps: exercise.targetReps || 10,
      actualReps: null,
      weight: exercise.isBodyweight ? null : (exercise.suggestedWeight || 10),
      status: 'pending',
      completedAt: null
    };
    exercise.setRecords.push(setRec);
  }

  if (actualReps !== undefined) setRec.actualReps = actualReps !== null ? parseInt(actualReps, 10) : null;
  if (weight !== undefined) setRec.weight = weight !== null ? parseFloat(weight) : null;
  if (status !== undefined) setRec.status = status;
  if (status === 'completed' && !setRec.completedAt) setRec.completedAt = new Date().toISOString();
  if (status === 'pending') setRec.completedAt = null;

  // Recalculate exercise status
  const completedOrSkipped = exercise.setRecords.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  const completedCount = exercise.setRecords.filter(s => s.status === 'completed').length;
  if (completedOrSkipped === 0) {
    exercise.status = 'not_started';
    exercise.completed = false;
  } else if (completedOrSkipped === exercise.setRecords.length) {
    exercise.status = completedCount > 0 ? 'completed' : 'skipped';
    exercise.completed = (exercise.status === 'completed');
  } else {
    exercise.status = 'in_progress';
    exercise.completed = false;
  }

  // Recalculate weekly progress day completion
  const allExercisesCompleted = workout.exercises.every(e => e.status === 'completed' || e.completed);
  if (Array.isArray(normalized.weeklyProgress)) {
    normalized.weeklyProgress = normalized.weeklyProgress.map(day => {
      if (day.id === dayKey) {
        return { ...day, completed: allExercisesCompleted };
      }
      return day;
    });
  }

  await saveClient(normalized);
  return { client: sanitizeClient(normalized), exercise };
};

// Skip an entire exercise with optional reason
export const skipExercise = async (clientId, dayKey, exerciseId, reason = '') => {
  const client = await getClientById(clientId, { includePasswordHash: true });
  if (!client) return null;
  const normalized = normalizeClientWorkouts(client);
  const workout = normalized.dailyWorkouts[dayKey];
  if (!workout || !Array.isArray(workout.exercises)) return null;

  const exercise = workout.exercises.find(e => e.id === exerciseId);
  if (!exercise) return null;

  exercise.status = 'skipped';
  exercise.completed = false;
  exercise.skipReason = reason || 'Skipped by client';
  if (Array.isArray(exercise.setRecords)) {
    exercise.setRecords.forEach(s => {
      if (s.status === 'pending') {
        s.status = 'skipped';
        s.completedAt = new Date().toISOString();
      }
    });
  }

  // Recalculate weekly progress
  const allDoneOrSkipped = workout.exercises.every(e => e.status === 'completed' || e.status === 'skipped' || e.completed);
  if (Array.isArray(normalized.weeklyProgress)) {
    normalized.weeklyProgress = normalized.weeklyProgress.map(day => {
      if (day.id === dayKey) {
        return { ...day, completed: allDoneOrSkipped };
      }
      return day;
    });
  }

  await saveClient(normalized);
  return { client: sanitizeClient(normalized), exercise };
};

// Progress comparison helper (Previous session vs Current session)
export const getProgressComparison = async (clientId) => {
  const sessions = await getWorkoutSessions(clientId);
  if (!sessions || sessions.length < 1) {
    return { hasComparison: false, currentSession: null, previousSession: null, allSessions: [] };
  }
  const currentSession = sessions[0];
  const previousSession = sessions.length > 1 ? sessions[1] : null;

  let repsDelta = 0;
  let weightDelta = 0;
  let durationDelta = 0;
  const exerciseComparisons = [];

  if (previousSession) {
    const curReps = currentSession.summary?.totalReps || 0;
    const prevReps = previousSession.summary?.totalReps || 0;
    repsDelta = curReps - prevReps;

    const curVol = currentSession.summary?.totalWeightKg || 0;
    const prevVol = previousSession.summary?.totalWeightKg || 0;
    weightDelta = curVol - prevVol;

    durationDelta = (currentSession.durationSeconds || 0) - (previousSession.durationSeconds || 0);

    const curExMap = new Map();
    (currentSession.setRecords || []).forEach(sr => {
      if (!curExMap.has(sr.exerciseName)) curExMap.set(sr.exerciseName, []);
      curExMap.get(sr.exerciseName).push(sr);
    });

    const prevExMap = new Map();
    (previousSession.setRecords || []).forEach(sr => {
      if (!prevExMap.has(sr.exerciseName)) prevExMap.set(sr.exerciseName, []);
      prevExMap.get(sr.exerciseName).push(sr);
    });

    for (const [name, curSets] of curExMap.entries()) {
      const prevSets = prevExMap.get(name) || [];
      const curMaxWeight = Math.max(0, ...curSets.map(s => s.weight || 0));
      const prevMaxWeight = Math.max(0, ...prevSets.map(s => s.weight || 0));
      const curTotalReps = curSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);
      const prevTotalReps = prevSets.reduce((sum, s) => sum + (s.actualReps || 0), 0);

      exerciseComparisons.push({
        name,
        currentSetsCount: curSets.length,
        previousSetsCount: prevSets.length,
        currentTotalReps: curTotalReps,
        previousTotalReps: prevTotalReps,
        repsImprovement: curTotalReps - prevTotalReps,
        currentMaxWeight: curMaxWeight,
        previousMaxWeight: prevMaxWeight,
        weightProgression: curMaxWeight - prevMaxWeight
      });
    }
  }

  return {
    hasComparison: Boolean(previousSession),
    currentSession,
    previousSession,
    repsDelta,
    weightDelta,
    durationDelta,
    exerciseComparisons,
    allSessions: sessions
  };
};

// Re-export all database services for unified access
export * from './dbServices.js';


