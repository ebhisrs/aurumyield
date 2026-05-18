import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const data = await request.json();
    const { fullName, email, phone, country, program, amount, profitPreference, password } = data;

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    }

    if (global.__users.find(u => u.email === email)) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    const id = Math.max(0, ...global.__users.map(u => u.id)) + 1;
    const user = {
      id,
      name: fullName,
      email,
      phone: phone || '',
      country: country || '',
      password: bcrypt.hashSync(password, 10),
      role: 'client',
      status: 'pending',
      program: program || 'Conservative',
      profitPref: profitPreference || 'Monthly income withdrawals',
      balance: 0,
      withdrawable: 0,
      lockedCapital: 0,
      lastProfit: '-',
      createdAt: new Date().toISOString().split('T')[0],
    };

    global.__users.push(user);
    global.__audit.unshift({
      action: `New client registration: ${fullName} (${email})`,
      admin: 'System',
      date: new Date().toISOString(),
      ip: '0.0.0.0',
    });

    return NextResponse.json({ ok: true, message: 'Registration submitted. Awaiting admin approval.' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
