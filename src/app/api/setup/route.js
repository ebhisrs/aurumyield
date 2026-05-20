import { NextResponse } from 'next/server';
import { initDB } from '../lib/data.js';

export async function GET() {
  try {
    await initDB();
    return NextResponse.json({ ok: true, message: 'Database initialized successfully. Tables created and seeded.' });
  } catch (e) {
    return NextResponse.json({ error: 'DB setup failed: ' + e.message }, { status: 500 });
  }
}
