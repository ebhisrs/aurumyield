import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { initData } from '../lib/data.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';

function getAuth(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

export async function GET(request) {
  initData();
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (auth.role === 'admin' || auth.role === 'superadmin') return NextResponse.json(global.__deposits);
  return NextResponse.json(global.__deposits.filter(d => d.userId === auth.userId));
}

export async function POST(request) {
  initData();
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();

  if ((auth.role === 'admin' || auth.role === 'superadmin') && data.action) {
    const dep = global.__deposits.find(d => d.id === data.depositId);
    if (!dep) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const user = global.__users.find(u => u.id === dep.userId);

    if (data.action === 'approve') {
      dep.status = 'approved';
      if (user) {
        user.balance += dep.amount;
        user.lockedCapital += dep.amount;
        if (user.status === 'pending') user.status = 'approved';
        const txId = Math.max(0, ...global.__transactions.map(t => t.id)) + 1;
        global.__transactions.push({ id: txId, userId: user.id, type: 'deposit', desc: `Deposit approved — ${dep.ref}`, amount: dep.amount, balanceBefore: user.balance - dep.amount, balanceAfter: user.balance, status: 'Paid', date: new Date().toISOString().split('T')[0] });
      }
      global.__audit.unshift({ action: `Approved deposit ${dep.ref} for ${user?.name}; +$${dep.amount.toLocaleString()}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
    } else if (data.action === 'reject') {
      dep.status = 'rejected';
      global.__audit.unshift({ action: `Rejected deposit ${dep.ref}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
    }
    return NextResponse.json({ ok: true });
  }

  if (auth.role === 'client') {
    const user = global.__users.find(u => u.id === auth.userId);
    if (!user || user.status === 'disabled') return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    if (!data.amount || Number(data.amount) < 1000) return NextResponse.json({ error: 'Minimum deposit is $1,000' }, { status: 400 });
    const id = Math.max(0, ...global.__deposits.map(d => d.id)) + 1;
    global.__deposits.push({
      id, userId: auth.userId, amount: Number(data.amount), currency: data.currency || 'USD',
      method: data.method || 'Bank Transfer', status: 'pending', proof: null,
      ref: `DEP-${1000 + id}`, date: new Date().toISOString().split('T')[0],
    });
    global.__audit.unshift({ action: `New deposit request from ${user.name}: $${data.amount}`, admin: 'System', date: new Date().toISOString(), ip: '0.0.0.0' });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
