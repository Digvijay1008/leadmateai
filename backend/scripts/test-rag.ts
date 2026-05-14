import jwt from 'jsonwebtoken';
import { config } from '../src/config/index.js';
import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testRAG() {
    console.log('Generating JWT...');
    // Hardcoded test tenant id from verify-no-mic.ts results
    const tenantId = '32f67511-cc64-4856-bceb-86f21797e206';

    const authToken = jwt.sign(
        {
            user_id: 'test-user-id',
            tenant_id: tenantId,
            type: 'widget',
        },
        config.jwt.secret,
        { expiresIn: '2h' }
    );

    const agentToken = jwt.sign(
        {
            session_id: 'test-session',
            tenant_id: tenantId,
            type: 'agent',
        },
        config.jwt.secret,
        { expiresIn: '2h' }
    );

    const baseUrl = 'http://localhost:3001/api';

    console.log('Uploading test_clinic.txt...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test_clinic.txt'));

    const uploadRes = await fetch(`${baseUrl}/v1/knowledge-base/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            ...formData.getHeaders()
        },
        body: formData,
    });

    const uploadData = await uploadRes.json();
    console.log('Upload response:', uploadData);

    // Give it a second to embed
    console.log('Waiting 2s for embedding generation...');
    await new Promise(r => setTimeout(r, 2000));

    console.log('Testing RAG Query as Agent...');
    const queryRes = await fetch(`${baseUrl}/v1/rag/query-formatted`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${agentToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'What are the opening hours?' })
    });

    const queryData = await queryRes.json();
    console.log('Query response:', queryData);
}

testRAG().catch(console.error);
