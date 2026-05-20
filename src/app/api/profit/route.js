import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getTransactions, getAuditLog, getProfitBatches, getEligibleClients, updateUserBalance, addTransaction, addProfitBatch, addAudit } from '../lib/data.js';

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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'transactions') {
      if (auth.role === 'admin' || auth.role === 'superadmin') return NextResponse.json(await getTransactions());
      return NextResponse.json(await getTransactions(auth.userId));
    }
    if (type === 'audit') {
      if (auth.role !== 'admin' && auth.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json(await getAuditLog(50));
    }
    if (type === 'batches') {
      if (auth.role !== 'admin' && auth.role !== 'superadmin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      return NextResponse.json(await getProfitBatches());
    }
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = getAuth(request);
  if (!auth || (auth.role !== 'admin' && auth.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { program, percentage, note } = await request.json();
    const rate = Number(percentage) / 100;
    if (!program || !rate) return NextResponse.json({ error: 'Program and percentage required' }, { status: 400 });

    const eligible = await getEligibleClients(program);
    if (eligible.length === 0) return NextResponse.json({ error: 'No eligible clients' }, { status: 400 });

    let totalProfit = 0;
    for (const user of eligible) {
      const profit = Math.round(user.balance * rate * 100) / 100;
      const newBalance = user.balance + profit;
      const newWithdrawable = user.withdrawable + profit;
      await updateUserBalance(user.id, newBalance, newWithdrawable, user.lockedCapital, percentage + '%');
      await addTransaction(user.id, 'performance', `Monthly profit — ${program} ${percentage}%`, profit, user.balance, newBalance);
      totalProfit += profit;
    }

    await addProfitBatch(program, Number(percentage), eligible.length, totalProfit, note, auth.username || 'Admin');
    await addAudit(`Posted ${percentage}% profit to ${eligible.length} ${program} clients. Total: $${totalProfit.toLocaleString()}`, auth.username || 'Admin');
    return NextResponse.json({ ok: true, clients: eligible.length, totalProfit });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
