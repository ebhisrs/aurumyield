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
  if (auth.role === 'admin' || auth.role === 'superadmin') return NextResponse.json(global.__withdrawals);
  return NextResponse.json(global.__withdrawals.filter(w => w.userId === auth.userId));
}

export async function POST(request) {
  initData();
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();

  if ((auth.role === 'admin' || auth.role === 'superadmin') && data.action) {
    const w = global.__withdrawals.find(x => x.id === data.withdrawalId);
    if (!w) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const user = global.__users.find(u => u.id === w.userId);

    if (data.action === 'approve') {
      if (!user || user.status !== 'approved') return NextResponse.json({ error: 'Client not active' }, { status: 400 });
      if (w.amount > user.withdrawable || w.amount > user.balance) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      w.status = 'approved';
      user.balance -= w.amount;
      user.withdrawable -= w.amount;
      const txId = Math.max(0, ...global.__transactions.map(t => t.id)) + 1;
      global.__transactions.push({ id: txId, userId: user.id, type: 'withdrawal', desc: 'Withdrawal approved', amount: -w.amount, balanceBefore: user.balance + w.amount, balanceAfter: user.balance, status: 'Paid', date: new Date().toISOString().split('T')[0] });
      global.__audit.unshift({ action: `Approved withdrawal for ${user.name}; -$${w.amount.toLocaleString()}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
    } else if (data.action === 'reject') {
      w.status = 'rejected';
      global.__audit.unshift({ action: `Rejected withdrawal for ${user?.name}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
    }
    return NextResponse.json({ ok: true });
  }

  if (auth.role === 'client') {
    const user = global.__users.find(u => u.id === auth.userId);
    if (!user || user.status !== 'approved') return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    if (Number(data.amount) > user.withdrawable) return NextResponse.json({ error: 'Insufficient withdrawable balance' }, { status: 400 });
    const id = Math.max(0, ...global.__withdrawals.map(w => w.id)) + 1;
    global.__withdrawals.push({
      id, userId: auth.userId, amount: Number(data.amount), source: data.source || 'Available Profit Balance',
      method: data.method || 'Bank Transfer', destination: data.destination || '', status: 'pending',
      date: new Date().toISOString().split('T')[0],
    });
    global.__audit.unshift({ action: `New withdrawal request from ${user.name}: $${data.amount}`, admin: 'System', date: new Date().toISOString(), ip: '0.0.0.0' });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Bad request' }, { status: 400 });
}
