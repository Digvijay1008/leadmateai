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

async function testOutboundCall() {
    try {
        const httpUrl = config.livekit.url
            .replace('wss://', 'https://')
            .replace('ws://', 'http://');

        const client = new SipClient(
            httpUrl,
            config.livekit.apiKey,
            config.livekit.apiSecret
        );

        const trunkId = 'ST_mtrrL2Lcjfdf';
        const to = '+919876543210'; // Dummy number
        const roomName = 'test-room-' + Date.now();

        console.log(`Attempting to create SIP participant...`);
        console.log(`Trunk ID: ${trunkId}`);
        console.log(`To: ${to}`);
        console.log(`Room: ${roomName}`);

        const participant = await client.createSipParticipant(
            trunkId,
            to,
            roomName,
            {
                participantIdentity: 'test-sip-identity',
                participantName: 'Test SIP Call',
                waitUntilAnswered: false, // Don't wait for answer to see if creation works
            }
        );

        console.log('Success! Participant created:', participant);
    } catch (err) {
        console.error('FAILED with error:');
        console.error(err);
        if (err.message) console.error('Message:', err.message);
        if (err.status) console.error('Status:', err.status);
    }
}

testOutboundCall();
