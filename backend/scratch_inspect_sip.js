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

async function inspectTrunks() {
    try {
        const inboundTrunks = await client.listSipInboundTrunk();
        console.log('Inbound Trunks:', JSON.stringify(inboundTrunks, null, 2));
        
        const outboundTrunks = await client.listSipOutboundTrunk();
        console.log('Outbound Trunks:', JSON.stringify(outboundTrunks, null, 2));

        const dispatchRules = await client.listSipDispatchRule();
        console.log('Dispatch Rules:', JSON.stringify(dispatchRules, null, 2));
    } catch (err) {
        console.error('Inspect Error:', err);
    }
}

inspectTrunks();
