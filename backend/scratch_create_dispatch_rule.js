import { AgentServiceClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const url = process.env.LIVEKIT_URL?.replace('wss://', 'https://');

async function createGlobalDispatchRule() {
    const client = new AgentServiceClient(url, apiKey, apiSecret);

    console.log('Creating Global Room Dispatch Rule for leadmate-agent...');

    try {
        const rule = await client.createDispatchRule({
            agentName: 'leadmate-agent',
            roomNamePrefix: 'call-', // Matches all our canonical room names
        });

        console.log('Successfully created Dispatch Rule:', rule.id);
    } catch (err) {
        console.error('Failed to create Dispatch Rule:', err.message);
        console.log('It might already exist, which is fine.');
    }
}

createGlobalDispatchRule();
