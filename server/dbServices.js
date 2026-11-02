import { 
  pool, 
  isPostgres, 
  getJsonDb, 
  saveJsonDb, 
  getClientById, 
  saveClient, 
  getClients
} from './db.js';
import { 
  initialTrainers, 
  initialMembershipPlans, 
  initialGymSettings
} from './seedData.js';

// =============================================================
// Helper: Format Dates & Currencies
// =============================================================
const getTodayIso = () => new Date().toISOString().split('T')[0];
const getTodayFormatted = () => new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

// =============================================================
// 1. Attendance Management
// =============================================================

export const recordAttendanceCheckIn = async ({ clientId, date, sessionName, signature }) => {
  if (!clientId) {
    return { error: 'INVALID_CLIENT', message: 'Client ID is required.' };
  }

  const client = await getClientById(clientId, { includePasswordHash: true });
  if (!client) {
    return { error: 'NOT_FOUND', message: 'Client not found.' };
  }

  const dateLabel = date || getTodayIso();
  const displayDate = getTodayFormatted();
  const session = sessionName || 'General Gym Access';
  const sig = signature || 'FIT_BY_SHAHID_';
  const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  if (isPostgres) {
    try {
      // Check if attendance already recorded for this client on this date
      const checkRes = await pool.query(
        'SELECT * FROM attendance WHERE client_id = $1 AND (date_label = $2 OR date_label = $3)',
        [clientId, dateLabel, displayDate]
      );
      if (checkRes.rows.length > 0) {
        return { 
          alreadyCheckedIn: true, 
          message: 'Client has already checked in for today.',
          record: checkRes.rows[0] 
        };
      }

      const insertRes = await pool.query(`
        INSERT INTO attendance (id, client_id, date_label, session_name, signature, check_in_time, status, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), 'Present', NOW())
        RETURNING *
      `, [attendanceId, clientId, dateLabel, session, sig]);

      // Also append to client's signinHistory in relational document
      const newHistoryItem = { id: attendanceId, date: displayDate, signature: sig, session };
      client.signinHistory = [newHistoryItem, ...(client.signinHistory || [])];
      await saveClient(client);

      return { success: true, record: insertRes.rows[0], clientName: client.name };
    } catch (err) {
      console.error('Error recording attendance in PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.attendance)) db.attendance = [];

    // Duplicate check
    const existing = db.attendance.find(a => 
      a.clientId === clientId && (a.dateLabel === dateLabel || a.dateLabel === displayDate)
    );
    if (existing) {
      return {
        alreadyCheckedIn: true,
        message: 'Client has already checked in for today.',
        record: existing
      };
    }

    const newRecord = {
      id: attendanceId,
      clientId,
      clientName: client.name,
      dateLabel,
      sessionName: session,
      signature: sig,
      checkInTime: new Date().toISOString(),
      status: 'Present',
      createdAt: new Date().toISOString()
    };

    db.attendance.unshift(newRecord);

    // Also update client signinHistory
    const newHistoryItem = { id: attendanceId, date: displayDate, signature: sig, session };
    client.signinHistory = [newHistoryItem, ...(client.signinHistory || [])];
    await saveClient(client);
    saveJsonDb();

    return { success: true, record: newRecord, clientName: client.name };
  }
};

export const getAttendanceRecords = async ({ date, range = 'all', clientId } = {}) => {
  if (isPostgres) {
    try {
      let query = `
        SELECT a.*, c.name as client_name, c.username as client_username, c.photo as client_photo
        FROM attendance a
        LEFT JOIN clients c ON a.client_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (clientId) {
        params.push(clientId);
        query += ` AND a.client_id = $${params.length}`;
      }

      if (date) {
        params.push(date);
        query += ` AND (a.date_label = $${params.length} OR a.created_at::date = $${params.length}::date)`;
      } else if (range === 'today') {
        query += ` AND (a.created_at::date = CURRENT_DATE OR a.date_label = TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD'))`;
      } else if (range === 'week') {
        query += ` AND a.created_at >= NOW() - INTERVAL '7 days'`;
      } else if (range === 'month') {
        query += ` AND a.created_at >= NOW() - INTERVAL '30 days'`;
      }

      query += ` ORDER BY a.created_at DESC`;
      const res = await pool.query(query, params);
      return res.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name || 'Member',
        clientUsername: row.client_username || '',
        clientPhoto: row.client_photo || '/images/therese.webp',
        dateLabel: row.date_label,
        sessionName: row.session_name || 'General Access',
        signature: row.signature || 'FIT_BY_SHAHID_',
        checkInTime: row.check_in_time || row.created_at,
        status: row.status || 'Present',
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error('Error fetching attendance from PostgreSQL:', err);
      return [];
    }
  } else {
    const db = getJsonDb();
    let records = Array.isArray(db.attendance) ? [...db.attendance] : [];

    if (clientId) {
      records = records.filter(r => r.clientId === clientId);
    }

    if (date) {
      records = records.filter(r => r.dateLabel === date || (r.createdAt && r.createdAt.startsWith(date)));
    } else if (range === 'today') {
      const today = getTodayIso();
      const formatted = getTodayFormatted();
      records = records.filter(r => r.dateLabel === today || r.dateLabel === formatted || (r.createdAt && r.createdAt.startsWith(today)));
    } else if (range === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      records = records.filter(r => new Date(r.createdAt || r.dateLabel) >= sevenDaysAgo);
    } else if (range === 'month') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      records = records.filter(r => new Date(r.createdAt || r.dateLabel) >= thirtyDaysAgo);
    }

    // Attach client details
    const allClients = db.clients || [];
    return records.map(r => {
      const c = allClients.find(client => client.id === r.clientId);
      return {
        ...r,
        clientName: c ? c.name : (r.clientName || 'Member'),
        clientUsername: c ? c.username : '',
        clientPhoto: c ? c.photo : '/images/therese.webp'
      };
    });
  }
};

export const getClientAttendanceSummary = async (clientId) => {
  const records = await getAttendanceRecords({ clientId });
  const totalAttendedDays = records.length;
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthCount = records.filter(r => {
    const d = new Date(r.checkInTime || r.createdAt || r.dateLabel);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return {
    totalAttendedDays,
    currentMonthCount,
    recentCheckIns: records.slice(0, 10)
  };
};

// =============================================================
// 2. Membership Plans & Subscriptions
// =============================================================

export const getMembershipPlans = async () => {
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT * FROM membership_plans ORDER BY price ASC');
      if (res.rows.length === 0) {
        // Return defaults if none yet
        return initialMembershipPlans;
      }
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        price: parseFloat(r.price),
        durationMonths: r.duration_months,
        description: r.description,
        features: r.features || [],
        isActive: r.is_active
      }));
    } catch (err) {
      console.warn('Falling back to default membership plans:', err.message);
      return initialMembershipPlans;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.membershipPlans) || db.membershipPlans.length === 0) {
      db.membershipPlans = [...initialMembershipPlans];
      saveJsonDb();
    }
    return db.membershipPlans;
  }
};

export const saveMembershipPlan = async (plan) => {
  if (!plan || !plan.name) return null;
  const id = plan.id || `plan_${Date.now()}`;
  const price = parseFloat(plan.price) || 99;
  const durationMonths = parseInt(plan.durationMonths, 10) || 1;
  const features = Array.isArray(plan.features) ? plan.features : [];

  if (isPostgres) {
    try {
      const res = await pool.query(`
        INSERT INTO membership_plans (id, name, price, duration_months, description, features, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          price = EXCLUDED.price,
          duration_months = EXCLUDED.duration_months,
          description = EXCLUDED.description,
          features = EXCLUDED.features,
          is_active = EXCLUDED.is_active
        RETURNING *
      `, [id, plan.name, price, durationMonths, plan.description || '', JSON.stringify(features), plan.isActive !== false]);

      return {
        id: res.rows[0].id,
        name: res.rows[0].name,
        price: parseFloat(res.rows[0].price),
        durationMonths: res.rows[0].duration_months,
        description: res.rows[0].description,
        features: res.rows[0].features,
        isActive: res.rows[0].is_active
      };
    } catch (err) {
      console.error('Error saving membership plan in PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.membershipPlans)) db.membershipPlans = [];
    const formatted = {
      id,
      name: plan.name,
      price,
      durationMonths,
      description: plan.description || '',
      features,
      isActive: plan.isActive !== false
    };

    const idx = db.membershipPlans.findIndex(p => p.id === id);
    if (idx >= 0) db.membershipPlans[idx] = formatted;
    else db.membershipPlans.push(formatted);
    saveJsonDb();
    return formatted;
  }
};

export const getMemberships = async ({ clientId, status } = {}) => {
  if (isPostgres) {
    try {
      let query = `
        SELECT m.*, c.name as client_name, c.username as client_username, c.email as client_email
        FROM memberships m
        LEFT JOIN clients c ON m.client_id = c.id
        WHERE 1=1
      `;
      const params = [];
      if (clientId) {
        params.push(clientId);
        query += ` AND m.client_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND m.status = $${params.length}`;
      }
      query += ` ORDER BY m.expiry_date DESC`;
      const res = await pool.query(query, params);
      return res.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name,
        clientUsername: r.client_username,
        clientEmail: r.client_email,
        planId: r.plan_id,
        planName: r.plan_name,
        startDate: r.start_date,
        expiryDate: r.expiry_date,
        status: r.status,
        price: parseFloat(r.price || 0),
        autoRenew: r.auto_renew,
        createdAt: r.created_at
      }));
    } catch (err) {
      console.error('Error getting memberships from PostgreSQL:', err);
      return [];
    }
  } else {
    const db = getJsonDb();
    let list = Array.isArray(db.memberships) ? [...db.memberships] : [];
    if (clientId) list = list.filter(m => m.clientId === clientId);
    if (status) list = list.filter(m => m.status === status);

    const allClients = db.clients || [];
    return list.map(m => {
      const c = allClients.find(client => client.id === m.clientId);
      return {
        ...m,
        clientName: c ? c.name : 'Client',
        clientUsername: c ? c.username : '',
        clientEmail: c ? c.email : ''
      };
    });
  }
};

export const assignMembershipToClient = async ({ clientId, planId, planName, startDate, expiryDate, price, autoRenew }) => {
  const client = await getClientById(clientId, { includePasswordHash: true });
  if (!client) return null;

  const membershipId = `mem_${clientId}_${Date.now()}`;
  const start = startDate || getTodayIso();
  let expiry = expiryDate;
  if (!expiry) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + 1);
    expiry = d.toISOString().split('T')[0];
  }

  const name = planName || client.membershipPlan || 'Gold Monthly';
  const memPrice = price !== undefined ? parseFloat(price) : 99;

  if (isPostgres) {
    try {
      const res = await pool.query(`
        INSERT INTO memberships (id, client_id, plan_id, plan_name, start_date, expiry_date, status, price, auto_renew, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'Active', $7, $8, NOW(), NOW())
        RETURNING *
      `, [membershipId, clientId, planId || null, name, start, expiry, memPrice, Boolean(autoRenew)]);

      // Update client record
      client.membershipPlan = name;
      client.membershipStartDate = start;
      client.membershipExpiryDate = expiry;
      client.status = 'Active';
      await saveClient(client);

      return res.rows[0];
    } catch (err) {
      console.error('Error assigning membership in PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.memberships)) db.memberships = [];

    const newMem = {
      id: membershipId,
      clientId,
      planId: planId || 'plan_gold',
      planName: name,
      startDate: start,
      expiryDate: expiry,
      status: 'Active',
      price: memPrice,
      autoRenew: Boolean(autoRenew),
      createdAt: new Date().toISOString()
    };

    db.memberships.unshift(newMem);

    // Update client record
    client.membershipPlan = name;
    client.membershipStartDate = start;
    client.membershipExpiryDate = expiry;
    client.status = 'Active';
    await saveClient(client);
    saveJsonDb();

    return newMem;
  }
};

export const renewClientMembership = async (membershipId, extensionMonths = 1) => {
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT * FROM memberships WHERE id = $1', [membershipId]);
      if (res.rows.length === 0) return null;
      const mem = res.rows[0];
      const curExpiry = new Date(mem.expiry_date);
      const baseDate = curExpiry > new Date() ? curExpiry : new Date();
      baseDate.setMonth(baseDate.getMonth() + extensionMonths);
      const newExpiry = baseDate.toISOString().split('T')[0];

      const updateRes = await pool.query(`
        UPDATE memberships
        SET expiry_date = $1, status = 'Active', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [newExpiry, membershipId]);

      // Update client profile
      const client = await getClientById(mem.client_id, { includePasswordHash: true });
      if (client) {
        client.membershipExpiryDate = newExpiry;
        client.status = 'Active';
        await saveClient(client);
      }

      return updateRes.rows[0];
    } catch (err) {
      console.error('Error renewing membership in PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    const mem = (db.memberships || []).find(m => m.id === membershipId);
    if (!mem) return null;

    const curExpiry = new Date(mem.expiryDate || Date.now());
    const baseDate = curExpiry > new Date() ? curExpiry : new Date();
    baseDate.setMonth(baseDate.getMonth() + extensionMonths);
    const newExpiry = baseDate.toISOString().split('T')[0];

    mem.expiryDate = newExpiry;
    mem.status = 'Active';

    const client = await getClientById(mem.clientId, { includePasswordHash: true });
    if (client) {
      client.membershipExpiryDate = newExpiry;
      client.status = 'Active';
      await saveClient(client);
    }
    saveJsonDb();
    return mem;
  }
};

// =============================================================
// 3. Payments & Billing
// =============================================================

export const recordPaymentTransaction = async ({
  clientId,
  membershipId,
  amount,
  currency = 'USD',
  paymentMethod = 'Credit Card',
  paymentStatus = 'Completed',
  notes = '',
  transactionId
}) => {
  if (!clientId || amount === undefined) {
    return { error: 'INVALID_PAYMENT', message: 'Client ID and amount are required.' };
  }

  const client = await getClientById(clientId);
  if (!client) {
    return { error: 'NOT_FOUND', message: 'Client not found.' };
  }

  const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const txnId = transactionId || `TXN_${Date.now().toString().slice(-6)}`;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const numAmount = parseFloat(amount);

  if (isPostgres) {
    try {
      const res = await pool.query(`
        INSERT INTO payments (
          id, client_id, membership_id, amount, currency,
          payment_method, payment_status, transaction_id, invoice_number,
          payment_date, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, NOW())
        RETURNING *
      `, [id, clientId, membershipId || null, numAmount, currency, paymentMethod, paymentStatus, txnId, invoiceNumber, notes]);

      return {
        ...res.rows[0],
        clientName: client.name
      };
    } catch (err) {
      console.error('Error recording payment in PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.payments)) db.payments = [];

    const paymentRecord = {
      id,
      clientId,
      clientName: client.name,
      membershipId: membershipId || null,
      amount: numAmount,
      currency,
      paymentMethod,
      paymentStatus,
      transactionId: txnId,
      invoiceNumber,
      paymentDate: new Date().toISOString(),
      notes,
      createdAt: new Date().toISOString()
    };

    db.payments.unshift(paymentRecord);
    saveJsonDb();
    return paymentRecord;
  }
};

export const getPaymentRecords = async ({ clientId, status } = {}) => {
  if (isPostgres) {
    try {
      let query = `
        SELECT p.*, c.name as client_name, c.username as client_username, c.photo as client_photo
        FROM payments p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE 1=1
      `;
      const params = [];
      if (clientId) {
        params.push(clientId);
        query += ` AND p.client_id = $${params.length}`;
      }
      if (status) {
        params.push(status);
        query += ` AND p.payment_status = $${params.length}`;
      }
      query += ` ORDER BY p.payment_date DESC`;
      const res = await pool.query(query, params);
      return res.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        clientName: r.client_name || 'Member',
        clientUsername: r.client_username || '',
        clientPhoto: r.client_photo || '/images/therese.webp',
        membershipId: r.membership_id,
        amount: parseFloat(r.amount),
        currency: r.currency || 'USD',
        paymentMethod: r.payment_method,
        paymentStatus: r.payment_status,
        transactionId: r.transaction_id,
        invoiceNumber: r.invoice_number,
        paymentDate: r.payment_date,
        notes: r.notes,
        createdAt: r.created_at
      }));
    } catch (err) {
      console.error('Error fetching payments from PostgreSQL:', err);
      return [];
    }
  } else {
    const db = getJsonDb();
    let records = Array.isArray(db.payments) ? [...db.payments] : [];
    if (clientId) records = records.filter(p => p.clientId === clientId);
    if (status) records = records.filter(p => p.paymentStatus === status);

    const allClients = db.clients || [];
    return records.map(p => {
      const c = allClients.find(client => client.id === p.clientId);
      return {
        ...p,
        clientName: c ? c.name : (p.clientName || 'Member'),
        clientUsername: c ? c.username : '',
        clientPhoto: c ? c.photo : '/images/therese.webp'
      };
    });
  }
};

// =============================================================
// 4. Trainers
// =============================================================

export const getTrainersList = async () => {
  if (isPostgres) {
    try {
      const res = await pool.query('SELECT * FROM trainers ORDER BY name ASC');
      if (res.rows.length === 0) return initialTrainers;
      return res.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        specialty: r.specialty,
        bio: r.bio,
        photo: r.photo,
        status: r.status
      }));
    } catch (err) {
      console.warn('Falling back to default trainers:', err.message);
      return initialTrainers;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.trainers) || db.trainers.length === 0) {
      db.trainers = [...initialTrainers];
      saveJsonDb();
    }
    return db.trainers;
  }
};

export const saveTrainerProfile = async (trainer) => {
  if (!trainer || !trainer.name) return null;
  const id = trainer.id || `tr_${Date.now()}`;

  if (isPostgres) {
    try {
      const res = await pool.query(`
        INSERT INTO trainers (id, name, email, phone, specialty, bio, photo, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          specialty = EXCLUDED.specialty,
          bio = EXCLUDED.bio,
          photo = EXCLUDED.photo,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *
      `, [
        id, 
        trainer.name, 
        trainer.email || '', 
        trainer.phone || '', 
        trainer.specialty || 'General Fitness', 
        trainer.bio || '', 
        trainer.photo || '/images/john.webp', 
        trainer.status || 'Active'
      ]);
      return res.rows[0];
    } catch (err) {
      console.error('Error saving trainer in PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.trainers)) db.trainers = [];
    const formatted = {
      id,
      name: trainer.name,
      email: trainer.email || '',
      phone: trainer.phone || '',
      specialty: trainer.specialty || 'General Fitness',
      bio: trainer.bio || '',
      photo: trainer.photo || '/images/john.webp',
      status: trainer.status || 'Active'
    };

    const idx = db.trainers.findIndex(t => t.id === id);
    if (idx >= 0) db.trainers[idx] = formatted;
    else db.trainers.push(formatted);
    saveJsonDb();
    return formatted;
  }
};

// =============================================================
// 5. Notifications
// =============================================================

export const getClientNotifications = async (clientId) => {
  if (!clientId) return [];

  if (isPostgres) {
    try {
      const res = await pool.query(
        'SELECT * FROM notifications WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
        [clientId]
      );
      return res.rows.map(r => ({
        id: r.id,
        clientId: r.client_id,
        title: r.title,
        message: r.message,
        type: r.type,
        isRead: r.is_read,
        link: r.link,
        createdAt: r.created_at
      }));
    } catch (err) {
      console.warn('Error fetching notifications from PostgreSQL:', err.message);
      return [];
    }
  } else {
    const db = getJsonDb();
    const list = Array.isArray(db.notifications) ? db.notifications : [];
    return list.filter(n => n.clientId === clientId);
  }
};

export const createClientNotification = async ({ clientId, title, message, type = 'info', link = '/client/dashboard' }) => {
  if (!clientId || !title) return null;
  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  if (isPostgres) {
    try {
      const res = await pool.query(`
        INSERT INTO notifications (id, client_id, title, message, type, is_read, link, created_at)
        VALUES ($1, $2, $3, $4, $5, false, $6, NOW())
        RETURNING *
      `, [id, clientId, title, message, type, link]);
      return res.rows[0];
    } catch (err) {
      console.error('Error inserting notification into PostgreSQL:', err);
      throw err;
    }
  } else {
    const db = getJsonDb();
    if (!Array.isArray(db.notifications)) db.notifications = [];
    const notif = {
      id,
      clientId,
      title,
      message,
      type,
      isRead: false,
      link,
      createdAt: new Date().toISOString()
    };
    db.notifications.unshift(notif);
    saveJsonDb();
    return notif;
  }
};

export const markNotificationAsRead = async (notificationId, clientId) => {
  if (isPostgres) {
    try {
      await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND client_id = $2', [notificationId, clientId]);
      return true;
    } catch (err) {
      console.error('Error marking notification read in PostgreSQL:', err);
      return false;
    }
  } else {
    const db = getJsonDb();
    const notif = (db.notifications || []).find(n => n.id === notificationId && n.clientId === clientId);
    if (notif) {
      notif.isRead = true;
      saveJsonDb();
      return true;
    }
    return false;
  }
};

// =============================================================
// 6. Admin Settings & Gym Profile
// =============================================================

export const getGymSettings = async () => {
  const db = getJsonDb();
  return db.settings || initialGymSettings;
};

export const updateGymSettings = async (settings) => {
  const db = getJsonDb();
  db.settings = {
    ...(db.settings || initialGymSettings),
    ...settings
  };
  saveJsonDb();
  return db.settings;
};

// =============================================================
// 7. Full Admin Dashboard Analytics
// =============================================================

export const getAdminDashboardOverview = async () => {
  const clientsList = await getClients();
  const totalClients = clientsList.length;
  const activeClients = clientsList.filter(c => (c.status || 'Active').toLowerCase() === 'active').length;
  const inactiveClients = totalClients - activeClients;

  const trainers = await getTrainersList();
  const totalTrainers = trainers.length;

  const todayAttendanceList = await getAttendanceRecords({ range: 'today' });
  const todayAttendance = todayAttendanceList.length;

  const payments = await getPaymentRecords();
  const totalRevenue = payments
    .filter(p => p.paymentStatus === 'Completed')
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = payments
    .filter(p => {
      const d = new Date(p.paymentDate || p.createdAt);
      return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.paymentStatus === 'Completed';
    })
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const pendingPayments = payments.filter(p => p.paymentStatus === 'Pending');

  // Membership Expiry Stats
  const activeMemberships = clientsList.filter(c => {
    if (!c.membershipExpiryDate) return false;
    const exp = new Date(c.membershipExpiryDate);
    return exp >= now;
  }).length;

  const expiringSoon = clientsList.filter(c => {
    if (!c.membershipExpiryDate) return false;
    const exp = new Date(c.membershipExpiryDate);
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const expiredMemberships = totalClients - activeMemberships;

  // Workout aggregate stats across all clients
  let totalWorkoutSessions = 0;
  let totalSetsCompleted = 0;
  let totalRepsCompleted = 0;
  let totalWeightVolumeKg = 0;

  clientsList.forEach(c => {
    const sessions = c.workoutSessions || [];
    totalWorkoutSessions += sessions.length;
    sessions.forEach(s => {
      const summary = s.summary || {};
      totalSetsCompleted += summary.totalSetsCompleted || 0;
      totalRepsCompleted += summary.totalReps || 0;
      totalWeightVolumeKg += summary.totalWeightKg || 0;
    });
  });

  return {
    overview: {
      totalClients,
      activeClients,
      inactiveClients,
      totalTrainers,
      todayAttendance,
      monthlyRevenue,
      totalRevenue,
      pendingPaymentsCount: pendingPayments.length
    },
    membershipStats: {
      active: activeMemberships,
      expiringSoon,
      expired: expiredMemberships
    },
    workoutStats: {
      totalSessions: totalWorkoutSessions,
      totalSetsCompleted,
      totalRepsCompleted,
      totalWeightVolumeKg: Math.round(totalWeightVolumeKg)
    },
    recentPayments: payments.slice(0, 5),
    recentAttendance: todayAttendanceList.slice(0, 5)
  };
};

// =============================================================
// 8. Full Client Dashboard Overview
// =============================================================

export const getClientDashboardData = async (clientId) => {
  const client = await getClientById(clientId);
  if (!client) return null;

  const attendanceSummary = await getClientAttendanceSummary(clientId);
  const notifications = await getClientNotifications(clientId);
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  // Expiry calculation
  let daysUntilExpiry = null;
  let isMembershipExpired = false;
  if (client.membershipExpiryDate) {
    const exp = new Date(client.membershipExpiryDate);
    const now = new Date();
    daysUntilExpiry = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    isMembershipExpired = daysUntilExpiry < 0;
  }

  // Workouts count
  const sessions = client.workoutSessions || [];
  let totalSets = 0;
  let totalReps = 0;
  let totalWeightLifted = 0;

  sessions.forEach(s => {
    const sum = s.summary || {};
    totalSets += sum.totalSetsCompleted || 0;
    totalReps += sum.totalReps || 0;
    totalWeightLifted += sum.totalWeightKg || 0;
  });

  // Current day workout
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayKey = dayKeys[new Date().getDay()];
  const todayWorkout = client.dailyWorkouts?.[todayKey] || client.dailyWorkouts?.thu || null;

  return {
    client,
    stats: {
      totalWorkoutsCompleted: sessions.length,
      totalSetsCompleted: totalSets,
      totalRepsPerformed: totalReps,
      totalWeightLiftedKg: Math.round(totalWeightLifted),
      totalAttendedDays: attendanceSummary.totalAttendedDays,
      currentMonthAttendance: attendanceSummary.currentMonthCount
    },
    membership: {
      plan: client.membershipPlan || 'Gold Monthly',
      startDate: client.membershipStartDate,
      expiryDate: client.membershipExpiryDate,
      daysUntilExpiry,
      isExpired: isMembershipExpired,
      status: client.status || 'Active'
    },
    todayWorkout,
    nextSession: client.nextSession || null,
    recentSessions: sessions.slice(0, 5),
    notifications: notifications.slice(0, 5),
    unreadNotificationsCount
  };
};
