import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDeposits, createDeposit, getDepositById, updateDepositStatus, getUserById, updateUserBalance, updateUserStatus, addTransaction, addAudit } from '../lib/data.js';
import pg from 'pg';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';
const { Pool } = pg;
let pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  return pool;
}
async function query(text, params) { return await getPool().query(text, params); }

function getAuth(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

export async function GET(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const depositId = searchParams.get('depositId');
    const getProof = searchParams.get('proof');

    // Admin fetching proof for a specific deposit
    if ((auth.role === 'admin' || auth.role === 'superadmin') && depositId && getProof) {
      const { rows } = await query('SELECT proof, ref FROM deposits WHERE id = $1', [depositId]);
      if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ proof: rows[0].proof, ref: rows[0].ref });
    }

    if (auth.role === 'admin' || auth.role === 'superadmin') {
      // Return deposits with hasProof flag
      const { rows } = await query('SELECT id, user_id, amount, currency, method, status, ref, created_at, CASE WHEN proof IS NOT NULL AND proof != \'\' THEN true ELSE false END as has_proof FROM deposits ORDER BY id DESC');
      return NextResponse.json(rows.map(r => ({ id: r.id, userId: r.user_id, amount: Number(r.amount), currency: r.currency, method: r.method, status: r.status, ref: r.ref, date: r.created_at, hasProof: r.has_proof })));
    }

    const { rows } = await query('SELECT id, user_id, amount, currency, method, status, ref, created_at, CASE WHEN proof IS NOT NULL AND proof != \'\' THEN true ELSE false END as has_proof FROM deposits WHERE user_id = $1 ORDER BY id DESC', [auth.userId]);
    return NextResponse.json(rows.map(r => ({ id: r.id, userId: r.user_id, amount: Number(r.amount), currency: r.currency, method: r.method, status: r.status, ref: r.ref, date: r.created_at, hasProof: r.has_proof })));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await request.json();

    // Admin approving/rejecting
    if ((auth.role === 'admin' || auth.role === 'superadmin') && data.action) {
      const dep = await getDepositById(data.depositId);
      if (!dep) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const user = await getUserById(dep.userId);

      if (data.action === 'approve') {
        await updateDepositStatus(dep.id, 'approved');
        if (user) {
          const newBalance = user.balance + dep.amount;
          const newLocked = user.lockedCapital + dep.amount;
          await updateUserBalance(user.id, newBalance, user.withdrawable, newLocked, user.lastProfit);
          if (user.status === 'pending') await updateUserStatus(user.id, 'approved');
          await addTransaction(user.id, 'deposit', `Deposit approved — ${dep.ref}`, dep.amount, user.balance, newBalance);
        }
        await addAudit(`Approved deposit ${dep.ref} for ${user?.name}; +$${dep.amount.toLocaleString()}`, auth.username || 'Admin');
      } else if (data.action === 'reject') {
        await updateDepositStatus(dep.id, 'rejected');
        await addAudit(`Rejected deposit ${dep.ref} for ${user?.name}`, auth.username || 'Admin');
      }
      return NextResponse.json({ ok: true });
    }

    // Client creating deposit with optional proof
    if (auth.role === 'client') {
      const user = await getUserById(auth.userId);
      if (!user || user.status === 'disabled') return NextResponse.json({ error: 'Account not active' }, { status: 403 });
      if (!data.amount || Number(data.amount) < 1000) return NextResponse.json({ error: 'Minimum deposit is $1,000' }, { status: 400 });

      const { ref } = await createDeposit(auth.userId, Number(data.amount), data.currency || 'USD', data.method || 'Bank Transfer');

      // Save proof if provided
      if (data.proof) {
        await query('UPDATE deposits SET proof = $1 WHERE ref = $2', [data.proof, ref]);
      }

      await addAudit(`New deposit request from ${user.name}: $${data.amount} (${ref})${data.proof ? ' — with payment proof' : ' — no proof attached'}`, 'System');
      return NextResponse.json({ ok: true, ref });
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
