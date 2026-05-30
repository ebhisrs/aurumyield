import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) throw new Error('DATABASE_URL env var is missing');
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 5 });
  }
  return pool;
}

async function query(text, params) {
  const res = await getPool().query(text, params);
  return res;
}

// ─── SCHEMA ───────────────────────────────────────────────
export async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      password VARCHAR(200) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      status VARCHAR(20) DEFAULT 'active',
      permissions TEXT DEFAULT 'approve_clients,approve_deposits,approve_withdrawals,post_profit',
      created_at DATE DEFAULT CURRENT_DATE
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      email VARCHAR(200) UNIQUE NOT NULL,
      phone VARCHAR(50),
      country VARCHAR(100),
      password VARCHAR(200) NOT NULL,
      role VARCHAR(20) DEFAULT 'client',
      status VARCHAR(20) DEFAULT 'pending',
      program VARCHAR(50) DEFAULT 'Conservative',
      profit_pref VARCHAR(100) DEFAULT 'Monthly income withdrawals',
      balance NUMERIC(14,2) DEFAULT 0,
      withdrawable NUMERIC(14,2) DEFAULT 0,
      locked_capital NUMERIC(14,2) DEFAULT 0,
      last_profit VARCHAR(20) DEFAULT '-',
      created_at DATE DEFAULT CURRENT_DATE
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS deposits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      amount NUMERIC(14,2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'USD',
      method VARCHAR(100) DEFAULT 'Bank Transfer',
      status VARCHAR(20) DEFAULT 'pending',
      proof TEXT,
      ref VARCHAR(50),
      created_at DATE DEFAULT CURRENT_DATE
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      amount NUMERIC(14,2) NOT NULL,
      source VARCHAR(100) DEFAULT 'Available Profit Balance',
      method VARCHAR(100) DEFAULT 'Bank Transfer',
      destination VARCHAR(200),
      status VARCHAR(20) DEFAULT 'pending',
      created_at DATE DEFAULT CURRENT_DATE
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type VARCHAR(30) NOT NULL,
      description TEXT,
      amount NUMERIC(14,2) NOT NULL,
      balance_before NUMERIC(14,2),
      balance_after NUMERIC(14,2),
      status VARCHAR(20) DEFAULT 'Paid',
      created_at DATE DEFAULT CURRENT_DATE
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS audit (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      admin VARCHAR(100),
      ip VARCHAR(50) DEFAULT '0.0.0.0',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

  await query(`
    CREATE TABLE IF NOT EXISTS profit_batches (
      id SERIAL PRIMARY KEY,
      program VARCHAR(50),
      percentage NUMERIC(5,2),
      clients INTEGER,
      total_profit NUMERIC(14,2),
      note TEXT,
      admin VARCHAR(100),
      created_at DATE DEFAULT CURRENT_DATE
    )`);

  // Seed admins if empty
  const adminCheck = await query('SELECT id FROM admins LIMIT 1');
  if (adminCheck.rows.length === 0) {
    const superPass = bcrypt.hashSync(process.env.SUPER_PASS || 'super123', 10);
    const adminPass = bcrypt.hashSync(process.env.ADMIN_PASS || 'admin123', 10);
    await query('INSERT INTO admins (username, name, password, role, status, permissions) VALUES ($1, $2, $3, $4, $5, $6)', ['superadmin', 'Super Administrator', superPass, 'superadmin', 'active', 'all']);
    await query('INSERT INTO admins (username, name, password, role, status, permissions) VALUES ($1, $2, $3, $4, $5, $6)', ['admin', 'Admin User', adminPass, 'admin', 'active', 'approve_clients,approve_deposits,approve_withdrawals,post_profit']);
    await addAudit('System initialized with default admins', 'System');
  }

  // Seed settings if empty
  const settCheck = await query('SELECT key FROM settings LIMIT 1');
  if (settCheck.rows.length === 0) {
    const defaults = {
      platformName: '8QMM Gold', minDeposit: '1000', maxWithdrawalPercent: '100',
      conservativeTarget: '4', growthTarget: '8', kycRequired: 'true',
      autoApproveDeposits: 'false', autoApproveWithdrawals: 'false',
      maintenanceMode: 'false',
      disclaimer: 'Target returns are investment objectives, not guarantees. Capital is at risk.',
    };
    for (const [k, v] of Object.entries(defaults)) {
      await query('INSERT INTO settings (key, value) VALUES ($1, $2)', [k, v]);
    }
  }

  // Seed demo clients if empty
  const userCheck = await query('SELECT id FROM users LIMIT 1');
  if (userCheck.rows.length === 0) {
    const cp = bcrypt.hashSync('client123', 10);
    await query('INSERT INTO users (name, email, phone, country, password, status, program, profit_pref, balance, withdrawable, locked_capital, last_profit, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      ['Ahmed Al-Rashid', 'ahmed@example.com', '+971501234567', 'UAE', cp, 'approved', 'Conservative', 'Monthly income withdrawals', 12480, 1240, 10000, '3.2%', '2026-01-05']);
    await query('INSERT INTO users (name, email, phone, country, password, status, program, profit_pref, balance, withdrawable, locked_capital, last_profit, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      ['Sara Mansour', 'sara@example.com', '+962791234567', 'Jordan', cp, 'approved', 'Growth', 'Reinvest profits quarterly', 28500, 2100, 25000, '5.8%', '2026-01-12']);
    await query('INSERT INTO users (name, email, phone, country, password, status, program, profit_pref, balance, withdrawable, locked_capital, last_profit, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      ['Khalid Nasser', 'khalid@example.com', '+966551234567', 'Saudi Arabia', cp, 'pending', 'Conservative', 'Monthly income withdrawals', 0, 0, 0, '-', '2026-05-10']);
    await query('INSERT INTO users (name, email, phone, country, password, status, program, profit_pref, balance, withdrawable, locked_capital, last_profit, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      ['Fatima Hassan', 'fatima@example.com', '+971509876543', 'UAE', cp, 'disabled', 'Growth', 'Reinvest profits annually', 5200, 0, 5000, '4.0%', '2025-11-20']);
  }
}

// ─── AUDIT ────────────────────────────────────────────────
export async function addAudit(action, admin) {
  await query('INSERT INTO audit (action, admin) VALUES ($1, $2)', [action, admin || 'System']);
}

// ─── ADMINS ───────────────────────────────────────────────
export async function getAdmins() {
  const { rows } = await query('SELECT id, username, name, role, status, permissions, created_at FROM admins ORDER BY id');
  return rows.map(r => ({ ...r, permissions: r.permissions ? r.permissions.split(',') : [] }));
}

export async function getAdminByUsername(username) {
  const { rows } = await query('SELECT * FROM admins WHERE username = $1 AND status = $2', [username, 'active']);
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, permissions: r.permissions ? r.permissions.split(',') : [] };
}

export async function createAdmin(username, name, password, permissions) {
  const hash = bcrypt.hashSync(password, 10);
  const perms = (permissions || ['approve_clients','approve_deposits','approve_withdrawals','post_profit']).join(',');
  await query('INSERT INTO admins (username, name, password, permissions) VALUES ($1, $2, $3, $4)', [username, name, hash, perms]);
}

export async function updateAdmin(id, updates) {
  if (updates.status) await query('UPDATE admins SET status = $1 WHERE id = $2 AND role != $3', [updates.status, id, 'superadmin']);
  if (updates.permissions) await query('UPDATE admins SET permissions = $1 WHERE id = $2 AND role != $3', [updates.permissions.join(','), id, 'superadmin']);
  if (updates.newPassword) {
    const hash = bcrypt.hashSync(updates.newPassword, 10);
    await query('UPDATE admins SET password = $1 WHERE id = $2 AND role != $3', [hash, id, 'superadmin']);
  }
}

export async function deleteAdmin(id) {
  await query('DELETE FROM admins WHERE id = $1 AND role != $2', [id, 'superadmin']);
}

// ─── SETTINGS ─────────────────────────────────────────────
export async function getSettings() {
  const { rows } = await query('SELECT key, value FROM settings');
  const obj = {};
  rows.forEach(r => {
    if (r.value === 'true') obj[r.key] = true;
    else if (r.value === 'false') obj[r.key] = false;
    else if (!isNaN(r.value) && r.value !== '') obj[r.key] = Number(r.value);
    else obj[r.key] = r.value;
  });
  return obj;
}

export async function updateSettings(settings) {
  for (const [k, v] of Object.entries(settings)) {
    await query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [k, String(v)]);
  }
}

// ─── USERS ────────────────────────────────────────────────
export async function getUsers() {
  const { rows } = await query('SELECT id, name, email, phone, country, status, program, profit_pref, balance, withdrawable, locked_capital, last_profit, created_at FROM users ORDER BY id');
  return rows.map(r => ({ ...r, balance: Number(r.balance), withdrawable: Number(r.withdrawable), lockedCapital: Number(r.locked_capital), lastProfit: r.last_profit, profitPref: r.profit_pref, createdAt: r.created_at }));
}

export async function getUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}

export async function getUserById(id) {
  const { rows } = await query('SELECT id, name, email, phone, country, status, program, profit_pref, balance, withdrawable, locked_capital, last_profit, created_at FROM users WHERE id = $1', [id]);
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, balance: Number(r.balance), withdrawable: Number(r.withdrawable), lockedCapital: Number(r.locked_capital), lastProfit: r.last_profit, profitPref: r.profit_pref, createdAt: r.created_at };
}

export async function createUser(data) {
  const hash = bcrypt.hashSync(data.password, 10);
  const { rows } = await query('INSERT INTO users (name, email, phone, country, password, program, profit_pref) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [data.name, data.email, data.phone || '', data.country || '', hash, data.program || 'Conservative', data.profitPref || 'Monthly income withdrawals']);
  return rows[0].id;
}

export async function updateUserStatus(id, status) {
  await query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
}

export async function updateUserProfile(id, data) {
  const fields = [];
  const vals = [];
  let idx = 1;
  if (data.name !== undefined) { fields.push(`name = $${idx++}`); vals.push(data.name); }
  if (data.email !== undefined) { fields.push(`email = $${idx++}`); vals.push(data.email); }
  if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); vals.push(data.phone); }
  if (data.country !== undefined) { fields.push(`country = $${idx++}`); vals.push(data.country); }
  if (data.program !== undefined) { fields.push(`program = $${idx++}`); vals.push(data.program); }
  if (data.profitPref !== undefined) { fields.push(`profit_pref = $${idx++}`); vals.push(data.profitPref); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); vals.push(data.status); }
  if (data.balance !== undefined) { fields.push(`balance = $${idx++}`); vals.push(data.balance); }
  if (data.withdrawable !== undefined) { fields.push(`withdrawable = $${idx++}`); vals.push(data.withdrawable); }
  if (data.lockedCapital !== undefined) { fields.push(`locked_capital = $${idx++}`); vals.push(data.lockedCapital); }
  if (data.newPassword) {
    const hash = bcrypt.hashSync(data.newPassword, 10);
    fields.push(`password = $${idx++}`); vals.push(hash);
  }
  if (fields.length === 0) return;
  vals.push(id);
  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}`, vals);
}

export async function deleteUser(id) {
  await query('DELETE FROM transactions WHERE user_id = $1', [id]);
  await query('DELETE FROM deposits WHERE user_id = $1', [id]);
  await query('DELETE FROM withdrawals WHERE user_id = $1', [id]);
  await query('DELETE FROM users WHERE id = $1', [id]);
}

export async function updateUserBalance(id, balance, withdrawable, lockedCapital, lastProfit) {
  await query('UPDATE users SET balance = $1, withdrawable = $2, locked_capital = $3, last_profit = $4 WHERE id = $5',
    [balance, withdrawable, lockedCapital, lastProfit || '-', id]);
}

// ─── DEPOSITS ─────────────────────────────────────────────
function mapDeposit(r) {
  return { id: r.id, userId: r.user_id, amount: Number(r.amount), currency: r.currency, method: r.method, status: r.status, proof: r.proof, ref: r.ref, date: r.created_at };
}

export async function getDeposits(userId) {
  if (userId) {
    const { rows } = await query('SELECT * FROM deposits WHERE user_id = $1 ORDER BY id DESC', [userId]);
    return rows.map(mapDeposit);
  }
  const { rows } = await query('SELECT * FROM deposits ORDER BY id DESC');
  return rows.map(mapDeposit);
}

export async function createDeposit(userId, amount, currency, method) {
  const { rows } = await query('INSERT INTO deposits (user_id, amount, currency, method) VALUES ($1,$2,$3,$4) RETURNING id', [userId, amount, currency, method]);
  const id = rows[0].id;
  const ref = `DEP-${1000 + id}`;
  await query('UPDATE deposits SET ref = $1 WHERE id = $2', [ref, id]);
  return { id, ref };
}

export async function updateDepositStatus(id, status) {
  await query('UPDATE deposits SET status = $1 WHERE id = $2', [status, id]);
}

export async function getDepositById(id) {
  const { rows } = await query('SELECT * FROM deposits WHERE id = $1', [id]);
  return rows[0] ? mapDeposit(rows[0]) : null;
}

export async function updateDeposit(id, data) {
  const fields = []; const vals = []; let idx = 1;
  if (data.amount !== undefined) { fields.push(`amount = $${idx++}`); vals.push(data.amount); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); vals.push(data.status); }
  if (data.method !== undefined) { fields.push(`method = $${idx++}`); vals.push(data.method); }
  if (data.currency !== undefined) { fields.push(`currency = $${idx++}`); vals.push(data.currency); }
  if (fields.length === 0) return;
  vals.push(id);
  await query(`UPDATE deposits SET ${fields.join(', ')} WHERE id = $${idx}`, vals);
}

export async function deleteDeposit(id) {
  await query('DELETE FROM deposits WHERE id = $1', [id]);
}

// ─── WITHDRAWALS ──────────────────────────────────────────
function mapWithdrawal(r) {
  return { id: r.id, userId: r.user_id, amount: Number(r.amount), source: r.source, method: r.method, destination: r.destination, status: r.status, date: r.created_at };
}

export async function getWithdrawals(userId) {
  if (userId) {
    const { rows } = await query('SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY id DESC', [userId]);
    return rows.map(mapWithdrawal);
  }
  const { rows } = await query('SELECT * FROM withdrawals ORDER BY id DESC');
  return rows.map(mapWithdrawal);
}

export async function createWithdrawal(userId, amount, source, method, destination) {
  const { rows } = await query('INSERT INTO withdrawals (user_id, amount, source, method, destination) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [userId, amount, source, method, destination]);
  return rows[0].id;
}

export async function updateWithdrawalStatus(id, status) {
  await query('UPDATE withdrawals SET status = $1 WHERE id = $2', [status, id]);
}

export async function getWithdrawalById(id) {
  const { rows } = await query('SELECT * FROM withdrawals WHERE id = $1', [id]);
  return rows[0] ? mapWithdrawal(rows[0]) : null;
}

export async function updateWithdrawal(id, data) {
  const fields = []; const vals = []; let idx = 1;
  if (data.amount !== undefined) { fields.push(`amount = $${idx++}`); vals.push(data.amount); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); vals.push(data.status); }
  if (data.method !== undefined) { fields.push(`method = $${idx++}`); vals.push(data.method); }
  if (data.destination !== undefined) { fields.push(`destination = $${idx++}`); vals.push(data.destination); }
  if (fields.length === 0) return;
  vals.push(id);
  await query(`UPDATE withdrawals SET ${fields.join(', ')} WHERE id = $${idx}`, vals);
}

export async function deleteWithdrawal(id) {
  await query('DELETE FROM withdrawals WHERE id = $1', [id]);
}

// ─── TRANSACTIONS ─────────────────────────────────────────
function mapTx(r) {
  return { id: r.id, userId: r.user_id, type: r.type, desc: r.description, amount: Number(r.amount), balanceBefore: Number(r.balance_before), balanceAfter: Number(r.balance_after), status: r.status, date: r.created_at };
}

export async function getTransactions(userId) {
  if (userId) {
    const { rows } = await query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC', [userId]);
    return rows.map(mapTx);
  }
  const { rows } = await query('SELECT * FROM transactions ORDER BY id DESC');
  return rows.map(mapTx);
}

export async function addTransaction(userId, type, desc, amount, balanceBefore, balanceAfter) {
  await query('INSERT INTO transactions (user_id, type, description, amount, balance_before, balance_after) VALUES ($1,$2,$3,$4,$5,$6)',
    [userId, type, desc, amount, balanceBefore, balanceAfter]);
}

// ─── AUDIT ────────────────────────────────────────────────
export async function getAuditLog(limit) {
  const { rows } = await query('SELECT * FROM audit ORDER BY id DESC LIMIT $1', [limit || 50]);
  return rows.map(r => ({ action: r.action, admin: r.admin, date: r.created_at, ip: r.ip }));
}

// ─── PROFIT BATCHES ───────────────────────────────────────
export async function addProfitBatch(program, percentage, clients, totalProfit, note, admin) {
  await query('INSERT INTO profit_batches (program, percentage, clients, total_profit, note, admin) VALUES ($1,$2,$3,$4,$5,$6)',
    [program, percentage, clients, totalProfit, note || '', admin]);
}

export async function getProfitBatches() {
  const { rows } = await query('SELECT * FROM profit_batches ORDER BY id DESC');
  return rows.map(r => ({ id: r.id, program: r.program, percentage: Number(r.percentage), clients: r.clients, totalProfit: Number(r.total_profit), note: r.note, admin: r.admin, date: r.created_at }));
}

// ─── STATS ────────────────────────────────────────────────
export async function getStats() {
  const { rows } = await query(`SELECT
    (SELECT COUNT(*) FROM users WHERE status = 'approved') as active_clients,
    (SELECT COUNT(*) FROM users) as total_clients,
    (SELECT COALESCE(SUM(balance), 0) FROM users) as total_aum,
    (SELECT COUNT(*) FROM admins WHERE status = 'active' AND role = 'admin') as active_admins,
    (SELECT COUNT(*) FROM deposits WHERE status = 'pending') as pending_deposits,
    (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals,
    (SELECT COUNT(*) FROM users WHERE status = 'pending') as pending_clients,
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'approved') as total_deposited,
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status = 'approved') as total_withdrawn,
    (SELECT COUNT(*) FROM profit_batches) as profit_batches
  `);
  const s = rows[0];
  return {
    activeClients: Number(s.active_clients), totalClients: Number(s.total_clients),
    totalAum: Number(s.total_aum), activeAdmins: Number(s.active_admins),
    pendingDeposits: Number(s.pending_deposits), pendingWithdrawals: Number(s.pending_withdrawals),
    pendingClients: Number(s.pending_clients), totalDeposited: Number(s.total_deposited),
    totalWithdrawn: Number(s.total_withdrawn), profitBatches: Number(s.profit_batches),
  };
}

// ─── ELIGIBLE FOR PROFIT ──────────────────────────────────
export async function getEligibleClients(program) {
  const { rows } = await query("SELECT id, name, balance, withdrawable, locked_capital, last_profit, profit_pref FROM users WHERE program = $1 AND status = 'approved'", [program]);
  return rows.map(r => ({ id: r.id, name: r.name, balance: Number(r.balance), withdrawable: Number(r.withdrawable), lockedCapital: Number(r.locked_capital), lastProfit: r.last_profit, profitPref: r.profit_pref }));
}
