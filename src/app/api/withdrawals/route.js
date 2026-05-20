import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getWithdrawals, createWithdrawal, getWithdrawalById, updateWithdrawalStatus, getUserById, updateUserBalance, addTransaction, addAudit } from '../lib/data.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';

function getAuth(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

export async function GET(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    if (auth.role === 'admin' || auth.role === 'superadmin') return NextResponse.json(await getWithdrawals());
    return NextResponse.json(await getWithdrawals(auth.userId));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await request.json();

    if ((auth.role === 'admin' || auth.role === 'superadmin') && data.action) {
      const w = await getWithdrawalById(data.withdrawalId);
      if (!w) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const user = await getUserById(w.userId);

      if (data.action === 'approve') {
        if (!user || user.status !== 'approved') return NextResponse.json({ error: 'Client not active' }, { status: 400 });
        if (w.amount > user.withdrawable || w.amount > user.balance) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        await updateWithdrawalStatus(w.id, 'approved');
        const newBalance = user.balance - w.amount;
        const newWithdrawable = user.withdrawable - w.amount;
        await updateUserBalance(user.id, newBalance, newWithdrawable, user.lockedCapital, user.lastProfit);
        await addTransaction(user.id, 'withdrawal', 'Withdrawal approved', -w.amount, user.balance, newBalance);
        await addAudit(`Approved withdrawal for ${user.name}; -$${w.amount.toLocaleString()}`, auth.username || 'Admin');
      } else if (data.action === 'reject') {
        await updateWithdrawalStatus(w.id, 'rejected');
        await addAudit(`Rejected withdrawal for ${user?.name}`, auth.username || 'Admin');
      }
      return NextResponse.json({ ok: true });
    }

    if (auth.role === 'client') {
      const user = await getUserById(auth.userId);
      if (!user || user.status !== 'approved') return NextResponse.json({ error: 'Account not active' }, { status: 403 });
      if (Number(data.amount) > user.withdrawable) return NextResponse.json({ error: 'Insufficient withdrawable balance' }, { status: 400 });
      await createWithdrawal(auth.userId, Number(data.amount), data.source || 'Available Profit Balance', data.method || 'Bank Transfer', data.destination || '');
      await addAudit(`New withdrawal request from ${user.name}: $${data.amount}`, 'System');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
