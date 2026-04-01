const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const resClin = await pool.query('SELECT * FROM clinicas');
    console.log('CLINICAS:', resClin.rows);
    const resAgend = await pool.query('SELECT * FROM agendamentos');
    console.log('AGENDAMENTOS:', resAgend.rows);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
check();
