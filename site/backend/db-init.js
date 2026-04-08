require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function createTables() {
  try {
    console.log('⏳ Conectando ao banco de dados...');
    await client.connect();

    const query = `
      -- Tabelas Principais (Mente Nexus)
      CREATE TABLE IF NOT EXISTS clinicas (
        id VARCHAR(20) PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS profissionais (
        id SERIAL PRIMARY KEY,
        clinica_id VARCHAR(20) REFERENCES clinicas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        especialidade VARCHAR(255),
        dias_trabalho VARCHAR(100),
        horario_inicio TIME,
        horario_fim TIME,
        almoco_inicio TIME,
        almoco_fim TIME,
        duracao_atendimento INTEGER DEFAULT 50,
        capacidade_atendimento INTEGER DEFAULT 1,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        clinica_id VARCHAR(20) REFERENCES clinicas(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (telefone, clinica_id)
      );

      CREATE TABLE IF NOT EXISTS agendamentos (
        id SERIAL PRIMARY KEY,
        clinica_id VARCHAR(20) REFERENCES clinicas(id) ON DELETE CASCADE,
        cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
        profissional_id INTEGER REFERENCES profissionais(id) ON DELETE SET NULL,
        data_hora TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'pendente',
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabelas Auxiliares para o Workflow n8n (Secretária v3)
      CREATE TABLE IF NOT EXISTS n8n_fila_mensagens (
        id SERIAL PRIMARY KEY,
        id_mensagem VARCHAR(255),
        telefone VARCHAR(50),
        mensagem TEXT,
        timestamp TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS n8n_historico_mensagens (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255),
        message JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS n8n_status_atendimento (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE,
        lock_conversa BOOLEAN DEFAULT FALSE,
        aguardando_followup BOOLEAN DEFAULT FALSE,
        numero_followup INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('🛠️ Criando tabelas auxiliares para o n8n...');
    await client.query(query);
    console.log('✅ Estrutura de banco de dados sincronizada!');
    
  } catch (err) {
    console.error('❌ Erro ao atualizar banco:', err.message);
  } finally {
    await client.end();
  }
}

createTables();
