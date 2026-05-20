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

  if (auth.role === 'admin' || auth.role === 'superadmin') {
    const users = global.__users.map(({ password, ...u }) => u);
    return NextResponse.json(users);
  }

  const user = global.__users.find(u => u.id === auth.userId);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { password, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PUT(request) {
  initData();
  const auth = getAuth(request);
  if (!auth || (auth.role !== 'admin' && auth.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, action } = await request.json();
  const user = global.__users.find(u => u.id === userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (action === 'approve') {
    user.status = 'approved';
    global.__audit.unshift({ action: `Approved client: ${user.name}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
  } else if (action === 'disable') {
    user.status = 'disabled';
    global.__audit.unshift({ action: `Disabled client: ${user.name}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
  } else if (action === 'enable') {
    user.status = 'approved';
    global.__audit.unshift({ action: `Enabled client: ${user.name}`, admin: auth.username || 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
  }
  return NextResponse.json({ ok: true });
}
