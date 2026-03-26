const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const sqlFile = path.join(__dirname, '../../../database/migrations/001_initial_schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

(async () => {
  const client = await pool.connect();
  try {
    console.log('🚀 Running migration: 001_initial_schema.sql ...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');
    console.log('📦 All 22 tables created in "Varuna Nexus"');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
