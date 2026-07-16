import { NextResponse } from 'next/server';
import pg from 'pg';

const { Pool } = pg;
let pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 });
  return pool;
}

export async function GET() {
  try {
    const result = await getPool().query('UPDATE users SET withdrawable = balance');
    return NextResponse.json({ ok: true, message: `Updated ${result.rowCount} client(s). Withdrawable now equals balance for all.` });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
