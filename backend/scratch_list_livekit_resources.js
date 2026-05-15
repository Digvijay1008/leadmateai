import { SipClient } from 'livekit-server-sdk';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    livekit: {
        url: process.env.LIVEKIT_URL,
        apiKey: process.env.LIVEKIT_API_KEY,
        apiSecret: process.env.LIVEKIT_API_SECRET,
    }
};

async function listLiveKitTrunks() {
    try {
        const httpUrl = config.livekit.url
            .replace('wss://', 'https://')
            .replace('ws://', 'http://');

        const client = new SipClient(
            httpUrl,
            config.livekit.apiKey,
            config.livekit.apiSecret
        );

        console.log('Fetching SIP Trunks from LiveKit...');
        const trunks = await client.listSipTrunk();
        console.log('--- LIVEKIT TRUNKS ---');
        console.log(JSON.stringify(trunks, null, 2));

        console.log('\nFetching Dispatch Rules from LiveKit...');
        const rules = await client.listSipDispatchRule();
        console.log('--- LIVEKIT DISPATCH RULES ---');
        console.log(JSON.stringify(rules, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

listLiveKitTrunks();
