import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS_HASH = bcrypt.hashSync(process.env.ADMIN_PASS || 'admin123', 10);

// In-memory users store
if (!global.__users) {
  global.__users = [
    { id: 1, name: 'Ahmed Al-Rashid', email: 'ahmed@example.com', phone: '+971501234567', country: 'UAE', password: bcrypt.hashSync('client123', 10), role: 'client', status: 'approved', program: 'Conservative', profitPref: 'Monthly income withdrawals', balance: 12480, withdrawable: 1240, lockedCapital: 10000, lastProfit: '3.2%', createdAt: '2026-01-05' },
    { id: 2, name: 'Sara Mansour', email: 'sara@example.com', phone: '+962791234567', country: 'Jordan', password: bcrypt.hashSync('client123', 10), role: 'client', status: 'approved', program: 'Growth', profitPref: 'Reinvest profits quarterly', balance: 28500, withdrawable: 2100, lockedCapital: 25000, lastProfit: '5.8%', createdAt: '2026-01-12' },
    { id: 3, name: 'Khalid Nasser', email: 'khalid@example.com', phone: '+966551234567', country: 'Saudi Arabia', password: bcrypt.hashSync('client123', 10), role: 'client', status: 'pending', program: 'Conservative', profitPref: 'Monthly income withdrawals', balance: 0, withdrawable: 0, lockedCapital: 0, lastProfit: '-', createdAt: '2026-05-10' },
    { id: 4, name: 'Fatima Hassan', email: 'fatima@example.com', phone: '+971509876543', country: 'UAE', password: bcrypt.hashSync('client123', 10), role: 'client', status: 'disabled', program: 'Growth', profitPref: 'Reinvest profits annually', balance: 5200, withdrawable: 0, lockedCapital: 5000, lastProfit: '4.0%', createdAt: '2025-11-20' },
  ];
}

if (!global.__deposits) {
  global.__deposits = [
    { id: 1, userId: 1, amount: 10000, currency: 'USD', method: 'Bank Transfer', status: 'approved', proof: null, ref: 'DEP-1001', date: '2026-01-05' },
    { id: 2, userId: 1, amount: 2000, currency: 'USD', method: 'Bank Transfer', status: 'approved', proof: null, ref: 'DEP-1002', date: '2026-02-10' },
    { id: 3, userId: 2, amount: 25000, currency: 'USD', method: 'USDT / Stablecoin', status: 'approved', proof: null, ref: 'DEP-1003', date: '2026-01-12' },
    { id: 4, userId: 3, amount: 5000, currency: 'USD', method: 'Bank Transfer', status: 'pending', proof: null, ref: 'DEP-1004', date: '2026-05-10' },
  ];
}

if (!global.__withdrawals) {
  global.__withdrawals = [
    { id: 1, userId: 1, amount: 500, source: 'Available Profit Balance', method: 'Bank Transfer', destination: 'IBAN **** 4021', status: 'pending', date: '2026-03-15' },
    { id: 2, userId: 2, amount: 1000, source: 'Available Profit Balance', method: 'Crypto Wallet', destination: 'USDT **** 8A2', status: 'pending', date: '2026-04-12' },
  ];
}

if (!global.__transactions) {
  global.__transactions = [
    { id: 1, userId: 1, type: 'deposit', desc: 'Initial account funding', amount: 10000, balanceBefore: 0, balanceAfter: 10000, status: 'Paid', date: '2026-01-05' },
    { id: 2, userId: 1, type: 'performance', desc: 'Monthly profit — Conservative 3.6%', amount: 360, balanceBefore: 10000, balanceAfter: 10360, status: 'Paid', date: '2026-01-31' },
    { id: 3, userId: 1, type: 'deposit', desc: 'Additional funding', amount: 2000, balanceBefore: 10360, balanceAfter: 12360, status: 'Paid', date: '2026-02-10' },
    { id: 4, userId: 1, type: 'performance', desc: 'Monthly profit — Conservative 3.2%', amount: 420, balanceBefore: 12360, balanceAfter: 12780, status: 'Paid', date: '2026-02-28' },
    { id: 5, userId: 2, type: 'deposit', desc: 'Initial account funding', amount: 25000, balanceBefore: 0, balanceAfter: 25000, status: 'Paid', date: '2026-01-12' },
    { id: 6, userId: 2, type: 'performance', desc: 'Monthly profit — Growth 5.8%', amount: 1450, balanceBefore: 25000, balanceAfter: 26450, status: 'Paid', date: '2026-01-31' },
  ];
}

if (!global.__audit) {
  global.__audit = [
    { action: 'System initialized', admin: 'System', date: new Date().toISOString(), ip: '0.0.0.0' },
  ];
}

if (!global.__profitBatches) {
  global.__profitBatches = [];
}

export async function POST(request) {
  try {
    const { email, password, loginType } = await request.json();

    // Admin login
    if (loginType === 'admin') {
      if (email !== ADMIN_USER || !bcrypt.compareSync(password, ADMIN_PASS_HASH)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = jwt.sign({ role: 'admin', username: ADMIN_USER }, JWT_SECRET, { expiresIn: '24h' });
      return NextResponse.json({ token, role: 'admin', username: ADMIN_USER });
    }

    // Client login
    const user = global.__users.find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const token = jwt.sign({ role: 'client', userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ token, role: 'client', user: safeUser });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
