import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUsers, getUserById, updateUserStatus, updateUserProfile, deleteUser, addAudit } from '../lib/data.js';

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
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(request) {
  const auth = getAuth(request);
  if (!auth || (auth.role !== 'admin' && auth.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await request.json();
    const { userId, action } = data;
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Simple status action
    if (action === 'approve' || action === 'disable' || action === 'enable') {
      const newStatus = action === 'disable' ? 'disabled' : 'approved';
      await updateUserStatus(userId, newStatus);
      await addAudit(`${action} client: ${user.name}`, auth.username || 'Admin');
      return NextResponse.json({ ok: true });
    }

    // Full profile edit
    if (action === 'edit') {
      await updateUserProfile(userId, data);
      await addAudit(`Admin edited client profile: ${user.name} — fields: ${Object.keys(data).filter(k=>k!=='userId'&&k!=='action').join(', ')}`, auth.username || 'Admin');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(request) {
  const auth = getAuth(request);
  if (!auth || (auth.role !== 'admin' && auth.role !== 'superadmin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get('userId'));
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await deleteUser(userId);
    await addAudit(`Admin deleted client: ${user.name} (${user.email})`, auth.username || 'Admin');
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
