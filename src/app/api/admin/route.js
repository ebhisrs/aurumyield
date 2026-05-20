import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initData } from '../lib/data.js';

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
  initData();
  const sa = checkSuperAdmin(request);
  if (!sa) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'admins') {
    return NextResponse.json(global.__admins.map(({ password, ...a }) => a));
  }
  if (type === 'settings') {
    return NextResponse.json(global.__settings);
  }
  if (type === 'audit') {
    return NextResponse.json(global.__audit.slice(0, 100));
  }
  if (type === 'stats') {
    const activeClients = global.__users.filter(u => u.status === 'approved').length;
    const totalClients = global.__users.length;
    const totalAum = global.__users.reduce((s, u) => s + (u.balance || 0), 0);
    const activeAdmins = global.__admins.filter(a => a.status === 'active' && a.role === 'admin').length;
    const pendingDeposits = global.__deposits.filter(d => d.status === 'pending').length;
    const pendingWithdrawals = global.__withdrawals.filter(w => w.status === 'pending').length;
    const pendingClients = global.__users.filter(u => u.status === 'pending').length;
    const totalDeposited = global.__deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);
    const totalWithdrawn = global.__withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0);
    const profitBatches = global.__profitBatches.length;
    return NextResponse.json({ activeClients, totalClients, totalAum, activeAdmins, pendingDeposits, pendingWithdrawals, pendingClients, totalDeposited, totalWithdrawn, profitBatches });
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function POST(request) {
  initData();
  const sa = checkSuperAdmin(request);
  if (!sa) return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });

  const data = await request.json();

  if (data.action === 'create_admin') {
    const { username, name, password, permissions } = data;
    if (!username || !name || !password) return NextResponse.json({ error: 'Username, name, and password required' }, { status: 400 });
    if (global.__admins.find(a => a.username === username)) return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    const id = Math.max(0, ...global.__admins.map(a => a.id)) + 1;
    global.__admins.push({ id, username, name, password: bcrypt.hashSync(password, 10), role: 'admin', status: 'active', permissions: permissions || ['approve_clients','approve_deposits','approve_withdrawals','post_profit'], createdAt: new Date().toISOString().split('T')[0] });
    global.__audit.unshift({ action: `Super Admin created new admin: ${username}`, admin: sa.username, date: new Date().toISOString(), ip: '0.0.0.0' });
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'update_admin') {
    const admin = global.__admins.find(a => a.id === data.adminId);
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    if (admin.role === 'superadmin') return NextResponse.json({ error: 'Cannot modify super admin' }, { status: 403 });
    if (data.status) { admin.status = data.status; global.__audit.unshift({ action: `Super Admin ${data.status === 'active' ? 'enabled' : 'disabled'} admin: ${admin.username}`, admin: sa.username, date: new Date().toISOString(), ip: '0.0.0.0' }); }
    if (data.permissions) { admin.permissions = data.permissions; global.__audit.unshift({ action: `Super Admin updated permissions for: ${admin.username}`, admin: sa.username, date: new Date().toISOString(), ip: '0.0.0.0' }); }
    if (data.newPassword) { admin.password = bcrypt.hashSync(data.newPassword, 10); global.__audit.unshift({ action: `Super Admin reset password for: ${admin.username}`, admin: sa.username, date: new Date().toISOString(), ip: '0.0.0.0' }); }
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'delete_admin') {
    const idx = global.__admins.findIndex(a => a.id === data.adminId);
    if (idx === -1) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    if (global.__admins[idx].role === 'superadmin') return NextResponse.json({ error: 'Cannot delete super admin' }, { status: 403 });
    const removed = global.__admins.splice(idx, 1)[0];
    global.__audit.unshift({ action: `Super Admin deleted admin: ${removed.username}`, admin: sa.username, date: new Date().toISOString(), ip: '0.0.0.0' });
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'update_settings') {
    const { settings } = data;
    if (!settings) return NextResponse.json({ error: 'Settings object required' }, { status: 400 });
    Object.assign(global.__settings, settings);
    global.__audit.unshift({ action: `Super Admin updated platform settings`, admin: sa.username, date: new Date().toISOString(), ip: '0.0.0.0' });
    return NextResponse.json({ ok: true, settings: global.__settings });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
