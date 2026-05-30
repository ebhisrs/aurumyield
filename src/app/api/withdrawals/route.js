import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getWithdrawals, createWithdrawal, getWithdrawalById, updateWithdrawalStatus, updateWithdrawal, deleteWithdrawal, getUserById, updateUserBalance, addTransaction, addAudit } from '../lib/data.js';

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
        if (w.amount > user.balance) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        await updateWithdrawalStatus(w.id, 'approved');
        const newBalance = user.balance - w.amount;
        // Deduct from available profit first, then from locked capital
        let newWithdrawable = user.withdrawable;
        let newLocked = user.lockedCapital;
        let fromProfit = 0;
        let fromCapital = 0;
        if (w.amount <= user.withdrawable) {
          fromProfit = w.amount;
          newWithdrawable = user.withdrawable - w.amount;
        } else {
          fromProfit = user.withdrawable;
          fromCapital = w.amount - user.withdrawable;
          newWithdrawable = 0;
          newLocked = Math.max(0, user.lockedCapital - fromCapital);
        }
        await updateUserBalance(user.id, newBalance, newWithdrawable, newLocked, user.lastProfit);
        const desc = fromCapital > 0
          ? `Withdrawal approved — $${fromProfit.toLocaleString()} from profit + $${fromCapital.toLocaleString()} from capital`
          : `Withdrawal approved — $${fromProfit.toLocaleString()} from available profit`;
        await addTransaction(user.id, 'withdrawal', desc, -w.amount, user.balance, newBalance);
        await addAudit(`Approved withdrawal for ${user.name}; -$${w.amount.toLocaleString()} (profit: $${fromProfit}, capital: $${fromCapital})`, auth.username || 'Admin');
      } else if (data.action === 'reject') {
        await updateWithdrawalStatus(w.id, 'rejected');
        await addAudit(`Rejected withdrawal for ${user?.name}`, auth.username || 'Admin');
      } else if (data.action === 'edit') {
        await updateWithdrawal(w.id, data);
        await addAudit(`Admin edited withdrawal #${w.id}: ${JSON.stringify(data).slice(0,100)}`, auth.username || 'Admin');
      } else if (data.action === 'delete') {
        await deleteWithdrawal(w.id);
        await addAudit(`Admin deleted withdrawal #${w.id} (${user?.name}, $${w.amount})`, auth.username || 'Admin');
      }
      return NextResponse.json({ ok: true });
    }

    if (auth.role === 'client') {
      const user = await getUserById(auth.userId);
      if (!user || user.status !== 'approved') return NextResponse.json({ error: 'Account not active' }, { status: 403 });
      if (Number(data.amount) > user.balance) return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      await createWithdrawal(auth.userId, Number(data.amount), data.source || 'Available Balance', data.method || 'Bank Transfer', data.destination || '');
      await addAudit(`New withdrawal request from ${user.name}: $${data.amount}`, 'System');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
