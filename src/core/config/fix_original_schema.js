const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

(async () => {
  const client = await pool.connect();
  try {
    console.log(`🚀 Patching original database: "${process.env.DB_NAME}" ...`);

    // 1. Fix estimation_items: Add created_at
    await client.query(`
      ALTER TABLE estimation_items 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    // 2. Fix project_members: Add UNIQUE constraint
    const checkUnique = await client.query(`
      SELECT conname FROM pg_constraint WHERE conname = 'project_members_project_id_user_id_key'
    `);
    if (!checkUnique.rows.length) {
      await client.query(`
        ALTER TABLE project_members 
        ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);
      `);
    }

    // 3. Fix library_categories: Set NOT NULL on name
    await client.query(`
      DELETE FROM library_categories WHERE name IS NULL;
      ALTER TABLE library_categories ALTER COLUMN name SET NOT NULL;
    `);

    // 4. Fix project_members: Add role CHECK constraint
    const checkRole = await client.query(`
      SELECT conname FROM pg_constraint WHERE conname = 'project_members_role_check'
    `);
    if (!checkRole.rows.length) {
      await client.query(`
        ALTER TABLE project_members 
        ADD CONSTRAINT project_members_role_check 
        CHECK (role IN ('project_manager', 'pilot', 'admin'));
      `);
    }

    // 5. Fix projects: Add source_pipeline_id
    await client.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS source_pipeline_id UUID REFERENCES pipeline(id);
    `);

    console.log('✅ Original database successfully patched with all hardening constraints!');
  } catch (err) {
    console.error('❌ Patch failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
