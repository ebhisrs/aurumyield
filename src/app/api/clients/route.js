import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUsers, getUserById, updateUserStatus, addAudit } from '../lib/data.js';

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
    if (auth.role === 'admin' || auth.role === 'superadmin') return NextResponse.json(await getUsers());
    const user = await getUserById(auth.userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const auth = getAuth(request);
  if (!auth || (auth.role !== 'admin' && auth.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { userId, action } = await request.json();
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const newStatus = action === 'disable' ? 'disabled' : 'approved';
    await updateUserStatus(userId, newStatus);
    await addAudit(`${action} client: ${user.name}`, auth.username || 'Admin');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
