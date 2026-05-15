import { readFileSync } from 'fs';
import jwt from 'jsonwebtoken';

const env = readFileSync('.env', 'utf-8');
const jwtSecret = env.match(/JWT_SECRET=(.+)/)?.[1]?.trim();

// Get tenant ID from previous diagnostic
const tenantId = '425624ad-1b83-4f9c-adf5-0e03c886829c';

// Sign user token
const token = jwt.sign(
  { tenantId: tenantId, role: 'user' },
  jwtSecret,
  { expiresIn: '1h' }
);

try {
  const r = await fetch('http://localhost:3001/api/v1/voice/sessions/start', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: tenantId, direction: 'outbound', phone_number: '+919484957097' })
  });
  console.log('Dial response:', r.status, await r.text());
} catch (e) {
  console.error(e);
}
