import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getAdminByUsername, getUserByEmail, addAudit } from '../lib/data.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aurumyield-dev-secret';

export async function POST(request) {
  try {
    const { email, password, loginType } = await request.json();

    if (loginType === 'admin') {
      const admin = await getAdminByUsername(email);
      if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = jwt.sign({ role: admin.role, adminId: admin.id, username: admin.username, permissions: admin.permissions }, JWT_SECRET, { expiresIn: '24h' });
      await addAudit(`${admin.role === 'superadmin' ? 'Super Admin' : 'Admin'} logged in: ${admin.username}`, admin.username);
      return NextResponse.json({ token, role: admin.role, username: admin.username, permissions: admin.permissions });
    }

    const user = await getUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    const token = jwt.sign({ role: 'client', userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...safeUser } = user;
    return NextResponse.json({ token, role: 'client', user: safeUser });
  } catch (e) {
    return NextResponse.json({ error: 'Server error: ' + e.message }, { status: 500 });
  }
}
