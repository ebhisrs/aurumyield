import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';

function checkAdmin(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    return decoded.role === 'admin' || decoded.role === 'superadmin';
  } catch { return false; }
}

function checkClient(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role === 'client') return decoded;
    if (decoded.role === 'admin' || decoded.role === 'superadmin') return { ...decoded, isAdmin: true };
    return null;
  } catch { return null; }
}

export async function GET(request) {
  const auth = checkClient(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (auth.isAdmin || auth.role === 'admin') {
    const users = global.__users.map(({ password, ...u }) => u);
    return NextResponse.json(users);
  }

  const user = global.__users.find(u => u.id === auth.userId);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { password, ...safe } = user;
  return NextResponse.json(safe);
}

export async function PUT(request) {
  if (!checkAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { userId, action } = await request.json();
  const user = global.__users.find(u => u.id === userId);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (action === 'approve') {
    user.status = 'approved';
    global.__audit.unshift({ action: `Approved client: ${user.name}`, admin: 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
  } else if (action === 'disable') {
    user.status = 'disabled';
    global.__audit.unshift({ action: `Disabled client: ${user.name}`, admin: 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
  } else if (action === 'enable') {
    user.status = 'approved';
    global.__audit.unshift({ action: `Enabled client: ${user.name}`, admin: 'Admin', date: new Date().toISOString(), ip: '0.0.0.0' });
  }

  return NextResponse.json({ ok: true });
}
