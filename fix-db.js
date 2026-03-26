const db = require('./src/core/config/db');

async function fixConstraint() {
  try {
    console.log('Attempting to update pipeline_stage_check constraint...');
    
    // Drop existing constraint
    await db.query(`ALTER TABLE pipeline DROP CONSTRAINT IF EXISTS pipeline_stage_check`);
    
    // Add new constraint with 'converted'
    await db.query(`
      ALTER TABLE pipeline 
      ADD CONSTRAINT pipeline_stage_check 
      CHECK (stage IN ('enquiry', 'proposal', 'negotiation', 'verbal_confirmation', 'lost', 'converted'))
    `);
    
    console.log('✅ Pipeline stage constraint updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update constraint:', err);
    process.exit(1);
  }
}

fixConstraint();
