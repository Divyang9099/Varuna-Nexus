const db = require('./src/core/config/db');

async function migrateColumns() {
  try {
    await db.query(`ALTER TABLE project_documents RENAME COLUMN file_url TO file_key;`);
    console.log('✅ project_documents: file_url -> file_key');
  } catch(e) { console.log('⚠️ project_documents issue:', e.message); }

  try {
    await db.query(`ALTER TABLE deliverables RENAME COLUMN file_url TO file_key;`);
    console.log('✅ deliverables: file_url -> file_key');
  } catch(e) { console.log('⚠️ deliverables issue:', e.message); }
  
  try {
    await db.query(`ALTER TABLE library_documents RENAME COLUMN file_url TO file_key;`);
    console.log('✅ library_documents: file_url -> file_key');
  } catch(e) { console.log('⚠️ library_documents issue:', e.message); }
  
  try {
    await db.query(`ALTER TABLE library_versions RENAME COLUMN file_url TO file_key;`);
    console.log('✅ library_versions: file_url -> file_key');
  } catch(e) { console.log('⚠️ library_versions issue:', e.message); }

  console.log('Finished migrating columns to file_key');
  process.exit(0);
}

migrateColumns();
