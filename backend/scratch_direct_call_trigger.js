/**
 * Outbound Call Trigger — calls the running backend API
 * Run: node scratch_direct_call_trigger.js
 * 
 * Backend must be running: npm run dev
 */

const BACKEND_URL = 'http://localhost:3001';
const TO_NUMBER   = '9619810084';   // Your personal number (will be normalized to +91...)

// ── Step 1: login ──────────────────────────────────────────────────────────
async function getAuthToken() {
    // Try common admin credentials — update if different
    const attempts = [
        { email: 'admin@leadmate.ai', password: 'admin123' },
        { email: 'test@leadmate.ai', password: 'password123' },
    ];

    for (const creds of attempts) {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
        });
        if (res.ok) {
            const data = await res.json();
            const token = data?.data?.token || data?.token || data?.access_token;
            if (token) {
                console.log(`✅ Logged in as ${creds.email}`);
                return token;
            }
        }
    }
    return null;
}

// ── Step 2: dial ───────────────────────────────────────────────────────────
async function triggerTestCall() {
    console.log(`\n📞 Outbound test: calling ${TO_NUMBER}...\n`);

    const token = await getAuthToken();
    if (!token) {
        console.error('❌ Could not get auth token. Check email/password in this script.');
        process.exit(1);
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/calls/outbound`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ to: TO_NUMBER }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        console.error(`❌ Call failed [${res.status}]:`, JSON.stringify(body, null, 2));
        return;
    }

    console.log('✅ Call initiated!');
    console.log('   Session ID:    ', body?.data?.session_id);
    console.log('   Room Name:     ', body?.data?.livekit_room_name);
    console.log('   SIP Participant:', body?.data?.sip_participant_id);
    console.log('\n📱 Your phone should ring in ~3 seconds...\n');
}

triggerTestCall().catch(err => console.error('Fatal:', err.message));
