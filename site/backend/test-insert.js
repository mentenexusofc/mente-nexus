const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function insertTest() {
  try {
    const clinica_id = '5511999999999';
    await pool.query("INSERT INTO clinicas (id, nome) VALUES ($1, 'Mente Nexus') ON CONFLICT DO NOTHING", [clinica_id]);
    
    const cliRes = await pool.query("INSERT INTO clientes (clinica_id, nome, telefone) VALUES ($1, 'Test User', '123') ON CONFLICT (telefone, clinica_id) DO UPDATE SET nome = EXCLUDED.nome RETURNING id", [clinica_id]);
    const profRes = await pool.query("INSERT INTO profissionais (clinica_id, nome) VALUES ($1, 'Test Prof') RETURNING id", [clinica_id]);
    
    const cid = cliRes.rows[0].id;
    const pid = profRes.rows[0].id;
    const now = new Date().toISOString();

    const result = await pool.query(`
      INSERT INTO agendamentos (clinica_id, cliente_id, profissional_id, data_hora, status, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [clinica_id, cid, pid, now, 'pendente', 'Test manual insert']);
    
    console.log('SUCCESS:', result.rows[0]);
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
insertTest();
