import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env', 'utf-8');
const jwtSecret = env.match(/JWT_SECRET=(.+)/)?.[1]?.trim();
const dbUrl = env.match(/DATABASE_URL=(.+)/)?.[1]?.trim();
const backendUrl = 'http://localhost:3001';

// Get a real recent pending session
const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
const { rows } = await pool.query(`
  SELECT id, tenant_id, status FROM voice_sessions 
  WHERE direction = 'outbound' ORDER BY created_at DESC LIMIT 1
`);
await pool.end();

if (!rows.length) { console.log('No sessions found'); process.exit(1); }
const { id: sessionId, tenant_id: tenantId, status } = rows[0];
console.log('Latest session:', sessionId, 'status:', status);

// Sign a valid agent JWT
const token = jwt.sign(
  { session_id: sessionId, tenant_id: tenantId, type: 'agent' },
  jwtSecret,
  { expiresIn: '2h' }
);
console.log('Token prefix:', token.substring(0, 40) + '...');

// Call the activate endpoint
try {
  const r = await fetch(`${backendUrl}/api/v1/voice/sessions/${sessionId}/activate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = await r.text();
  console.log('\nActivate response:', r.status, body);
} catch(e) {
  console.error('Request failed:', e.message);
}
