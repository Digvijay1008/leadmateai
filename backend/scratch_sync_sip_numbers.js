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

const httpUrl = config.livekit.url.replace('wss://', 'https://');
const client = new SipClient(httpUrl, config.livekit.apiKey, config.livekit.apiSecret);

async function syncNumbers() {
    try {
        const inboundTrunkId = 'ST_mRR6oNwwQVJF';
        
        // Fetch current trunk to see existing numbers
        const trunks = await client.listSipInboundTrunk();
        const trunk = trunks.find(t => t.sipTrunkId === inboundTrunkId);
        
        if (!trunk) {
            console.error('Trunk not found');
            return;
        }

        console.log('Current Numbers:', trunk.inboundNumbers);
        
        // Update with ALL necessary numbers
        // We want both +918042455800 and +919484957097
        const updatedNumbers = [
            '+918042455800',
            '+919484957097',
            '+919619810084' // Just in case this IS the leadmate number
        ];

        console.log('Syncing numbers to LiveKit...');
        
        // LiveKit doesn't have an "update" for numbers easily in the SDK sometimes, 
        // but we can try to re-create or check if the SDK supports it.
        // The SipClient has createSipInboundTrunk which might overwrite if ID matches? 
        // Actually, the SDK usually has dedicated methods.
        
        // Wait, if I create a new one with same numbers it might conflict.
        // I'll check if I can delete and re-create if needed, but that's risky.
        
        console.log('Recommendation: If numbers mismatch, we should re-register the trunk via the app logic.');
        
    } catch (err) {
        console.error('Sync Error:', err);
    }
}

syncNumbers();
