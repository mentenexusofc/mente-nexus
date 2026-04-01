require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do Banco de Dados usando DATABASE_URL do .env (SSL desativado)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

app.use(cors());
app.use(express.json());

// Middleware para validar o header X-Clinica-ID
const validateClinicaHeader = (req, res, next) => {
  const clinicaId = req.headers['x-clinica-id'];
  if (!clinicaId) {
    return res.status(401).json({ error: 'X-Clinica-ID header é obrigatório' });
  }
  req.clinica_id = clinicaId;
  next();
};

// Rota de Boas-vindas
app.get('/', (req, res) => {
  res.json({ 
    status: "online",
    message: 'Mente Nexus API v1 - Bem-vindo!',
    timestamp: new Date()
  });
});

// --- ROTAS DE CLÍNICAS (ADMIN) ---

// Listar todas as clínicas (MASTER ADMIN)
app.get('/api/clinicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clinicas ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar nova clínica
app.post('/api/clinicas', async (req, res) => {
  const { id, nome, email } = req.body;
  if (!id || !nome) return res.status(400).json({ error: 'ID (telefone) e Nome são obrigatórios' });
  try {
    const result = await pool.query(`
      INSERT INTO clinicas (id, nome, email)
      VALUES ($1, $2, $3) RETURNING *
    `, [id.toString().replace(/\D/g, ''), nome, email]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Excluir clínica
app.delete('/api/clinicas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clinicas WHERE id = $1', [id]);
    res.json({ message: 'Clínica excluída com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROTAS DE CLIENTES ---

// Webhook para receber dados do n8n / WhatsApp (Cadastro inicial)
app.post('/webhook/n8n', async (req, res) => {
  const { clinica_id, clinica_nome, nome, telefone, email } = req.body;

  if (!clinica_id || !nome || !telefone) {
    return res.status(400).json({ 
      error: 'Campos obrigatórios ausentes: clinica_id, nome, telefone' 
    });
  }

  try {
    await pool.query(`
      INSERT INTO clinicas (id, nome)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING;
    `, [clinica_id, clinica_nome || 'Clínica Nova']);

    const query = `
      INSERT INTO clientes (clinica_id, nome, telefone, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telefone, clinica_id) DO UPDATE 
      SET nome = EXCLUDED.nome, email = EXCLUDED.email
      RETURNING *;
    `;
    const result = await pool.query(query, [clinica_id, nome, telefone, email]);
    
    res.status(201).json({ 
      message: 'Cliente processado com sucesso',
      cliente: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error.message);
    res.status(500).json({ error: 'Erro interno ao salvar cliente' });
  }
});

// Buscar cliente por telefone
app.get('/api/clientes/busca/:telefone', validateClinicaHeader, async (req, res) => {
  const { telefone } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE clinica_id = $1 AND telefone = $2',
      [req.clinica_id, telefone]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar clientes
app.get('/api/clientes', validateClinicaHeader, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE clinica_id = $1 ORDER BY nome ASC',
      [req.clinica_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar cliente manualmente
app.post('/api/clientes', validateClinicaHeader, async (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });

  try {
    const result = await pool.query(`
      INSERT INTO clientes (clinica_id, nome, telefone, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telefone, clinica_id) DO UPDATE 
      SET nome = EXCLUDED.nome, email = EXCLUDED.email
      RETURNING *;
    `, [req.clinica_id, nome, telefone, email]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar cliente
app.put('/api/clientes/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, email } = req.body;
  try {
    const result = await pool.query(`
      UPDATE clientes SET nome = $1, telefone = $2, email = $3
      WHERE id = $4 AND clinica_id = $5 RETURNING *
    `, [nome, telefone, email, id, req.clinica_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Excluir cliente
app.delete('/api/clientes/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1 AND clinica_id = $2', [id, req.clinica_id]);
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROTAS DE PROFISSIONAIS ---

// Listar profissionais
app.get('/api/profissionais', validateClinicaHeader, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profissionais WHERE clinica_id = $1 ORDER BY nome ASC',
      [req.clinica_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar profissional
app.post('/api/profissionais', validateClinicaHeader, async (req, res) => {
  const { nome, especialidade } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const result = await pool.query(`
      INSERT INTO profissionais (clinica_id, nome, especialidade)
      VALUES ($1, $2, $3) RETURNING *
    `, [req.clinica_id, nome, especialidade]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar profissional
app.put('/api/profissionais/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  const { nome, especialidade } = req.body;
  try {
    const result = await pool.query(`
      UPDATE profissionais SET nome = $1, especialidade = $2
      WHERE id = $3 AND clinica_id = $4 RETURNING *
    `, [nome, especialidade, id, req.clinica_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Excluir profissional
app.delete('/api/profissionais/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM profissionais WHERE id = $1 AND clinica_id = $2', [id, req.clinica_id]);
    res.json({ message: 'Profissional excluído com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- ROTAS DE AGENDAMENTOS ---

// Listar ocupação / disponibilidade simples
app.get('/api/disponibilidade', validateClinicaHeader, async (req, res) => {
  const { data, profissional_id } = req.query;
  if (!data || !profissional_id) return res.status(400).json({ error: 'Data e profissional_id são obrigatórios' });

  try {
    const result = await pool.query(`
      SELECT TO_CHAR(data_hora, 'HH24:MI') as hora
      FROM agendamentos 
      WHERE clinica_id = $1 
      AND profissional_id = $2 
      AND DATE(data_hora) = $3
    `, [req.clinica_id, profissional_id, data]);
    
    const ocupados = result.rows.map(r => r.hora);
    const todosHorarios = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const livres = todosHorarios.filter(h => !ocupados.includes(h));

    res.json({ livres, ocupados });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar todos os agendamentos da clínica
app.get('/api/agendamentos', validateClinicaHeader, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        a.id, a.data_hora, a.status, a.observacoes,
        c.nome as cliente_nome, c.telefone as cliente_telefone,
        p.nome as profissional_nome
      FROM agendamentos a
      JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN profissionais p ON a.profissional_id = p.id
      WHERE a.clinica_id = $1
      ORDER BY a.data_hora ASC
    `, [req.clinica_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar agendamento
app.post('/api/agendamentos', validateClinicaHeader, async (req, res) => {
  const { cliente_id, profissional_id, data_hora, status, observacoes } = req.body;

  if (!cliente_id || !data_hora || !profissional_id) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
  }

  try {
    const result = await pool.query(`
      INSERT INTO agendamentos (clinica_id, cliente_id, profissional_id, data_hora, status, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [req.clinica_id, cliente_id, profissional_id, data_hora, status || 'pendente', observacoes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar agendamento
app.put('/api/agendamentos/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  const { cliente_id, profissional_id, data_hora, status, observacoes } = req.body;

  try {
    const result = await pool.query(`
      UPDATE agendamentos 
      SET cliente_id = $1, profissional_id = $2, data_hora = $3, status = $4, observacoes = $5
      WHERE id = $6 AND clinica_id = $7
      RETURNING *;
    `, [cliente_id, profissional_id, data_hora, status, observacoes, id, req.clinica_id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Excluir agendamento
app.delete('/api/agendamentos/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM agendamentos WHERE id = $1 AND clinica_id = $2 RETURNING *',
      [id, req.clinica_id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ message: 'Agendamento excluído com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Mente Nexus rodando na porta ${PORT}`);
});
