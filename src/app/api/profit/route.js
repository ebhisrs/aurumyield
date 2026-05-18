import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';

function getAuth(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

export async function GET(request) {
  const auth = getAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'transactions') {
    if (auth.role === 'admin') return NextResponse.json(global.__transactions);
    return NextResponse.json(global.__transactions.filter(t => t.userId === auth.userId));
  }

  if (type === 'audit') {
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(global.__audit.slice(0, 50));
  }

  if (type === 'batches') {
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(global.__profitBatches);
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// Post profit batch
export async function POST(request) {
  const auth = getAuth(request);
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { program, percentage, note } = await request.json();
  const rate = Number(percentage) / 100;
  if (!program || !rate) return NextResponse.json({ error: 'Program and percentage required' }, { status: 400 });

  const eligible = global.__users.filter(u => u.program === program && u.status === 'approved');
  if (eligible.length === 0) return NextResponse.json({ error: 'No eligible clients' }, { status: 400 });

  const batchId = Math.max(0, ...global.__profitBatches.map(b => b.id)) + 1;
  let totalProfit = 0;

  eligible.forEach(user => {
    const profit = Math.round(user.balance * rate * 100) / 100;
    const balanceBefore = user.balance;
    user.balance += profit;
    user.withdrawable += profit;
    user.lastProfit = percentage + '%';
    totalProfit += profit;

    const txId = Math.max(0, ...global.__transactions.map(t => t.id)) + 1;
    global.__transactions.push({
      id: txId, userId: user.id, type: 'performance',
      desc: `Monthly profit — ${program} ${percentage}%`,
      amount: profit, balanceBefore, balanceAfter: user.balance,
      status: 'Paid', date: new Date().toISOString().split('T')[0],
    });
  });

  global.__profitBatches.push({
    id: batchId, program, percentage: Number(percentage),
    clients: eligible.length, totalProfit,
    note: note || '', admin: 'Admin',
    date: new Date().toISOString().split('T')[0],
  });

  global.__audit.unshift({
    action: `Posted ${percentage}% profit to ${eligible.length} ${program} clients. Total: $${totalProfit.toLocaleString()}. Note: ${note || 'N/A'}`,
    admin: 'Admin', date: new Date().toISOString(), ip: '0.0.0.0',
  });

  return NextResponse.json({ ok: true, clients: eligible.length, totalProfit });
}
