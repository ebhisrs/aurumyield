import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';
const { Pool } = pg;

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  }
  return pool;
}

async function query(text, params) {
  return await getPool().query(text, params);
}

// Ensure KYC table exists
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS kyc_documents (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      file_name VARCHAR(200),
      data TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      reviewed_by VARCHAR(100),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, type)
    )
  `);
}

function getAuth(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

// GET — client gets their docs, admin gets all or specific user
export async function GET(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Admin viewing specific client's docs
    if ((auth.role === 'admin' || auth.role === 'superadmin') && userId) {
      const { rows } = await query('SELECT id, user_id, type, file_name, status, created_at FROM kyc_documents WHERE user_id = $1 ORDER BY id', [userId]);
      return NextResponse.json({ documents: rows.map(r => ({ id: r.id, userId: r.user_id, type: r.type, fileName: r.file_name, status: r.status, date: r.created_at })) });
    }

    // Admin viewing all pending KYC
    if (auth.role === 'admin' || auth.role === 'superadmin') {
      const { rows } = await query("SELECT k.id, k.user_id, k.type, k.file_name, k.status, k.created_at, u.name, u.email FROM kyc_documents k JOIN users u ON k.user_id = u.id ORDER BY k.created_at DESC");
      return NextResponse.json({ documents: rows.map(r => ({ id: r.id, userId: r.user_id, type: r.type, fileName: r.file_name, status: r.status, date: r.created_at, userName: r.name, userEmail: r.email })) });
    }

    // Client viewing their own docs
    const { rows } = await query('SELECT id, type, file_name, status, created_at FROM kyc_documents WHERE user_id = $1 ORDER BY id', [auth.userId]);
    return NextResponse.json({ documents: rows.map(r => ({ id: r.id, type: r.type, fileName: r.file_name, status: r.status, date: r.created_at })) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — client uploads doc, admin approves/rejects
export async function POST(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureTable();
    const data = await request.json();

    // Admin reviewing a document
    if ((auth.role === 'admin' || auth.role === 'superadmin') && data.action) {
      if (data.action === 'approve') {
        await query('UPDATE kyc_documents SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3', ['approved', auth.username, data.docId]);
      } else if (data.action === 'reject') {
        await query('UPDATE kyc_documents SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3', ['rejected', auth.username, data.docId]);
      }
      // Log to audit
      await query('INSERT INTO audit (action, admin) VALUES ($1, $2)', [`KYC document ${data.action}d (ID: ${data.docId})`, auth.username]);
      return NextResponse.json({ ok: true });
    }

    // Client uploading a document
    if (auth.role === 'client') {
      const { type, fileName, data: fileData } = data;
      if (!type || !fileName || !fileData) return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
      if (!['passport', 'proof_of_address', 'selfie'].includes(type)) return NextResponse.json({ error: 'Invalid document type' }, { status: 400 });

      // Upsert — replace if already uploaded
      await query(`
        INSERT INTO kyc_documents (user_id, type, file_name, data, status)
        VALUES ($1, $2, $3, $4, 'pending')
        ON CONFLICT (user_id, type)
        DO UPDATE SET file_name = $3, data = $4, status = 'pending', created_at = NOW()
      `, [auth.userId, type, fileName, fileData]);

      await query('INSERT INTO audit (action, admin) VALUES ($1, $2)', [`Client uploaded KYC document: ${type} (${fileName})`, 'System']);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
