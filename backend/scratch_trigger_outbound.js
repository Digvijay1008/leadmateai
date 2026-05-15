import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:3000/api/v1'; // Assuming backend is on 3000

async function testOutboundCall() {
    try {
        const personalNo = '+919619810084';
        const fromNo = '+918042455800'; // Using the VoiceLink number
        
        console.log(`Initiating outbound call from ${fromNo} to ${personalNo}...`);
        
        const response = await axios.post(`${API_URL}/calls/dial`, {
            toNumber: personalNo,
            fromNumber: fromNo,
            tenantId: '425624ad-1b83-4f9c-adf5-0e03c886829c'
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN || 'admin-token'}`, // If needed
                'x-tenant-id': '425624ad-1b83-4f9c-adf5-0e03c886829c'
            }
        });
        
        console.log('Call Response:', response.data);
    } catch (err) {
        console.error('Outbound Test Error:', err.response?.data || err.message);
    }
}

testOutboundCall();
