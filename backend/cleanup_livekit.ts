 import { SipClient } from 'livekit-server-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config();

const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

async function cleanup() {
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        console.error('Missing LiveKit credentials in .env');
        process.exit(1);
    }

    const sipClient = new SipClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    console.log('Fetching existing Inbound SIP trunks...');
    try {
        const inboundTrunks = await sipClient.listSipInboundTrunk();
        for (const trunk of inboundTrunks) {
            console.log(`Deleting Inbound Trunk: ${trunk.sipTrunkId} (${trunk.name})`);
            await sipClient.deleteSipTrunk(trunk.sipTrunkId);
        }

        console.log('Fetching existing Outbound SIP trunks...');
        const outboundTrunks = await sipClient.listSipOutboundTrunk();
        for (const trunk of outboundTrunks) {
            console.log(`Deleting Outbound Trunk: ${trunk.sipTrunkId} (${trunk.name})`);
            await sipClient.deleteSipTrunk(trunk.sipTrunkId);
        }

        console.log('Fetching existing SIP Dispatch Rules...');
        const rules = await sipClient.listSipDispatchRule();
        for (const rule of rules) {
            console.log(`Deleting Dispatch Rule: ${rule.sipDispatchRuleId} (${rule.name})`);
            await sipClient.deleteSipDispatchRule(rule.sipDispatchRuleId);
        }

        console.log('✅ LiveKit SIP state fully cleaned up!');
    } catch (e) {
        console.error('Error during cleanup:', e);
    }
}

cleanup();
