import { queryMany } from './backend/src/platform/index.js';

async function check() {
    try {
        const trunks = await queryMany('SELECT id, name, sip_host FROM tenant_sip_trunks', []);
        const numbers = await queryMany('SELECT id, number, provider, sip_trunk_id FROM phone_numbers', []);
        console.log('Trunks:', trunks);
        console.log('Numbers:', numbers);
    } catch (e) {
        console.error(e);
    }
}

check();
