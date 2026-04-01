require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function clearData() {
  try {
    await client.connect();
    console.log('🧹 Limpando dados do banco de dados...');

    // Ordem inversa das dependências
    await client.query('TRUNCATE TABLE agendamentos RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE clientes RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE profissionais RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE clinicas RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE n8n_fila_mensagens RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE n8n_historico_mensagens RESTART IDENTITY CASCADE;');
    await client.query('TRUNCATE TABLE n8n_status_atendimento RESTART IDENTITY CASCADE;');

    console.log('✅ Banco de dados zerado com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao limpar dados:', err.message);
  } finally {
    await client.end();
  }
}

clearData();
