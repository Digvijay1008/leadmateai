
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
    console.error('❌ JWT_SECRET missing in .env');
    process.exit(1);
}

function generateToken() {
    console.log('🤖 Generating Agent Service Token...');

    // Create a long-lived JWT for the internal agent service
    const token = jwt.sign(
        {
            sub: 'system-agent-service',
            role: 'service_role', // Identify as internal service
            permissions: ['sessions:read', 'sessions:write', 'rag:read']
        },
        SECRET,
        { expiresIn: '365d' } // Valid for 1 year
    );

    console.log('\nAGENT_SERVICE_TOKEN:');
    console.log('---------------------------------------------------');
    console.log(token);
    console.log('---------------------------------------------------');
    console.log('👉 Copy this token into agent/.env');
}

generateToken();
