import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, addAudit } from '../../lib/data.js';

export async function POST(request) {
  try {
    const data = await request.json();
    const { fullName, email, phone, country, program, profitPreference, password } = data;
    if (!fullName || !email || !password) return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });

    const existing = await getUserByEmail(email);
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    await createUser({ name: fullName, email, phone, country, program, profitPref: profitPreference, password });
    await addAudit(`New client registration: ${fullName} (${email})`, 'System');
    return NextResponse.json({ ok: true, message: 'Registration submitted. Awaiting admin approval.' });
  } catch (e) {
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
