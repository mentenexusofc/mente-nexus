require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function seedDefaultClinica() {
  try {
    await client.connect();
    console.log('⏳ Garantindo que a clínica padrão existe...');
    
    await client.query(`
      INSERT INTO clinicas (id, nome, email)
      VALUES ('5511999999999', 'Mente Nexus', 'mentenexus.ia@gmail.com')
      ON CONFLICT (id) DO NOTHING;
    `);
    
    console.log('✅ Clínica padrão "Mente Nexus" configurada!');
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await client.end();
  }
}

seedDefaultClinica();
