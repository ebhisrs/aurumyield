import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDeposits, createDeposit, getDepositById, updateDepositStatus, getUserById, updateUserBalance, updateUserStatus, addTransaction, addAudit } from '../lib/data.js';

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
    if (auth.role === 'admin' || auth.role === 'superadmin') return NextResponse.json(await getDeposits());
    return NextResponse.json(await getDeposits(auth.userId));
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
        await addAudit(`Rejected deposit ${dep.ref}`, auth.username || 'Admin');
      }
      return NextResponse.json({ ok: true });
    }

    // Client creating deposit
    if (auth.role === 'client') {
      const user = await getUserById(auth.userId);
      if (!user || user.status === 'disabled') return NextResponse.json({ error: 'Account not active' }, { status: 403 });
      if (!data.amount || Number(data.amount) < 1000) return NextResponse.json({ error: 'Minimum deposit is $1,000' }, { status: 400 });
      const { ref } = await createDeposit(auth.userId, Number(data.amount), data.currency || 'USD', data.method || 'Bank Transfer');
      await addAudit(`New deposit request from ${user.name}: $${data.amount}`, 'System');
      return NextResponse.json({ ok: true, ref });
    }

    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
