import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, getSettings, updateSettings, getAuditLog, getStats, addAudit } from '../lib/data.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';

function checkSuperAdmin(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role === 'superadmin') return decoded;
    return null;
  } catch { return null; }
}

export async function GET(request) {
  const sa = checkSuperAdmin(request);
  if (!sa) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (type === 'admins') return NextResponse.json(await getAdmins());
    if (type === 'settings') return NextResponse.json(await getSettings());
    if (type === 'audit') return NextResponse.json(await getAuditLog(100));
    if (type === 'stats') return NextResponse.json(await getStats());
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const sa = checkSuperAdmin(request);
  if (!sa) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  try {
    const data = await request.json();

    if (data.action === 'create_admin') {
      if (!data.username || !data.name || !data.password) return NextResponse.json({ error: 'All fields required' }, { status: 400 });
      await createAdmin(data.username, data.name, data.password, data.permissions);
      await addAudit(`Super Admin created admin: ${data.username}`, sa.username);
      return NextResponse.json({ ok: true });
    }

    if (data.action === 'update_admin') {
      await updateAdmin(data.adminId, data);
      if (data.status) await addAudit(`Super Admin ${data.status} admin ID ${data.adminId}`, sa.username);
      if (data.permissions) await addAudit(`Super Admin updated permissions for admin ID ${data.adminId}`, sa.username);
      if (data.newPassword) await addAudit(`Super Admin reset password for admin ID ${data.adminId}`, sa.username);
      return NextResponse.json({ ok: true });
    }

    if (data.action === 'delete_admin') {
      await deleteAdmin(data.adminId);
      await addAudit(`Super Admin deleted admin ID ${data.adminId}`, sa.username);
      return NextResponse.json({ ok: true });
    }

    if (data.action === 'update_settings') {
      if (!data.settings) return NextResponse.json({ error: 'Settings required' }, { status: 400 });
      await updateSettings(data.settings);
      await addAudit('Super Admin updated platform settings', sa.username);
      const updated = await getSettings();
      return NextResponse.json({ ok: true, settings: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
