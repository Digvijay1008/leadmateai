const { Pool } = require('pg');
const p = new Pool({ connectionString: 'postgresql://postgres.egevpniucpmkfayleigr:RVRza7HuJJLO1TKN@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' });
p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tenants'")
  .then(r => { console.log(r.rows); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
