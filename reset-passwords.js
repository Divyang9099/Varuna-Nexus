const bcrypt = require('bcryptjs');
const db = require('./src/core/config/db');

async function resetPasswords() {
  try {
    const hash = await bcrypt.hash('password123', 12);
    await db.query('UPDATE users SET password_hash = $1', [hash]);
    const res = await db.query('SELECT name, role, email FROM users ORDER BY role');
    console.log('\n--- SYSTEM CREDENTIALS ---');
    console.log('Password for all accounts has been set to: password123\n');
    res.rows.forEach(r => {
      console.log(`Role: ${r.role.padEnd(15)} | Email: ${r.email.padEnd(25)} | Name: ${r.name}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  }
}

resetPasswords();
