import { queryMany } from './backend/src/platform/db/client.js';

async function checkSchema() {
    try {
        const columns = await queryMany(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'phone_numbers'
        `, []);
        console.log('Phone Numbers Columns:', columns);
        
        const trunkColumns = await queryMany(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tenant_sip_trunks'
        `, []);
        console.log('SIP Trunk Columns:', trunkColumns);
    } catch (e) {
        console.error(e);
    }
}

checkSchema();
