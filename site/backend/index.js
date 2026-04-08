require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do Banco de Dados usando DATABASE_URL do .env
// NOTA: Para conexões remotas, tente SSL primeiro. Se falhar, ajuste conforme necessário.
// Configuração do Banco de Dados
const databaseUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: false // Desativado para garantir compatibilidade na mesma VPS
});

if (!process.env.DATABASE_URL) {
  console.error('❌ CRÍTICO: DATABASE_URL não encontrada no ambiente!');
}

const allowedOrigins = [
  'https://ia.mentenexus.tech',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Clinica-ID', 'Authorization']
}));
app.use(express.json());

// Middleware para validar o header X-Clinica-ID
const validateClinicaHeader = (req, res, next) => {
  const clinicaId = req.headers['x-clinica-id'];
  if (!clinicaId) {
    return res.status(401).json({ error: 'X-Clinica-ID header é obrigatório' });
  }
  // Normalizar: remover tudo que não for número
  req.clinica_id = clinicaId.toString().replace(/\D/g, '');
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
app.get('/clinicas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clinicas ORDER BY criado_em DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Criar nova clínica
app.post('/clinicas', async (req, res) => {
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
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Excluir clínica
app.delete('/clinicas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clinicas WHERE id = $1', [id]);
    res.json({ message: 'Clínica excluída com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
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
    const cleanClinicaId = clinica_id.toString().replace(/\D/g, '');
    await pool.query(`
      INSERT INTO clinicas (id, nome)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING;
    `, [cleanClinicaId, clinica_nome || 'Clínica Nova']);

    const cleanTelefone = telefone.toString().replace(/\D/g, '');
    const query = `
      INSERT INTO clientes (clinica_id, nome, telefone, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telefone, clinica_id) DO UPDATE 
      SET nome = EXCLUDED.nome, email = EXCLUDED.email
      RETURNING *;
    `;
    const result = await pool.query(query, [cleanClinicaId, nome, cleanTelefone, email]);
    
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
app.get('/clientes/busca/:telefone', validateClinicaHeader, async (req, res) => {
  const { telefone } = req.params;
  const cleanTelefone = telefone.toString().replace(/\D/g, '');
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE clinica_id = $1 AND telefone = $2',
      [req.clinica_id, cleanTelefone]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Listar clientes
app.get('/clientes', validateClinicaHeader, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM clientes WHERE clinica_id = $1 ORDER BY nome ASC',
      [req.clinica_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Criar cliente manualmente
app.post('/clientes', validateClinicaHeader, async (req, res) => {
  const { nome, telefone, email } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });

  try {
    // Garantir que a clínica existe (mesmo se criada via header manualmente)
    await pool.query(`
      INSERT INTO clinicas (id, nome)
      VALUES ($1, $2)
      ON CONFLICT (id) DO NOTHING;
    `, [req.clinica_id, 'Clínica ' + req.clinica_id]);

    const cleanTelefone = telefone.toString().replace(/\D/g, '');
    const result = await pool.query(`
      INSERT INTO clientes (clinica_id, nome, telefone, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telefone, clinica_id) DO UPDATE 
      SET nome = EXCLUDED.nome, email = EXCLUDED.email
      RETURNING *;
    `, [req.clinica_id, nome, cleanTelefone, email]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Atualizar cliente
app.put('/clientes/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  const { nome, telefone, email } = req.body;
  const cleanTelefone = telefone.toString().replace(/\D/g, '');
  try {
    const result = await pool.query(`
      UPDATE clientes SET nome = $1, telefone = $2, email = $3
      WHERE id = $4 AND clinica_id = $5 RETURNING *
    `, [nome, cleanTelefone, email, id, req.clinica_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Excluir cliente
app.delete('/clientes/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clientes WHERE id = $1 AND clinica_id = $2', [id, req.clinica_id]);
    res.json({ message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// --- ROTAS DE PROFISSIONAIS ---

// Listar profissionais
app.get('/profissionais', validateClinicaHeader, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profissionais WHERE clinica_id = $1 ORDER BY nome ASC',
      [req.clinica_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Buscar profissional por ID (para n8n)
app.get('/profissionais/:id', validateClinicaHeader, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM profissionais WHERE id = $1 AND clinica_id = $2',
      [req.params.id, req.clinica_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Criar profissional
app.post('/profissionais', validateClinicaHeader, async (req, res) => {
  const { nome, especialidade, dias_trabalho, horario_inicio, horario_fim, almoco_inicio, almoco_fim, duracao_atendimento, capacidade_atendimento } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });
  try {
    const result = await pool.query(`
      INSERT INTO profissionais (clinica_id, nome, especialidade, dias_trabalho, horario_inicio, horario_fim, almoco_inicio, almoco_fim, duracao_atendimento, capacidade_atendimento)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
    `, [req.clinica_id, nome, especialidade, dias_trabalho, horario_inicio, horario_fim, almoco_inicio, almoco_fim, duracao_atendimento || 50, capacidade_atendimento || 1]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Atualizar profissional
app.put('/profissionais/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  const { nome, especialidade, dias_trabalho, horario_inicio, horario_fim, almoco_inicio, almoco_fim, duracao_atendimento, capacidade_atendimento } = req.body;
  try {
    const result = await pool.query(`
      UPDATE profissionais SET 
        nome = $1, 
        especialidade = $2,
        dias_trabalho = $3,
        horario_inicio = $4,
        horario_fim = $5,
        almoco_inicio = $6,
        almoco_fim = $7,
        duracao_atendimento = $8,
        capacidade_atendimento = $9
      WHERE id = $10 AND clinica_id = $11 RETURNING *
    `, [nome, especialidade, dias_trabalho, horario_inicio, horario_fim, almoco_inicio, almoco_fim, duracao_atendimento || 50, capacidade_atendimento || 1, id, req.clinica_id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profissional não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Excluir profissional
app.delete('/profissionais/:id', validateClinicaHeader, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM profissionais WHERE id = $1 AND clinica_id = $2', [id, req.clinica_id]);
    res.json({ message: 'Profissional excluído com sucesso' });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// --- ROTAS DE AGENDAMENTOS ---

// Listar ocupação / disponibilidade simples
app.get('/disponibilidade', validateClinicaHeader, async (req, res) => {
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
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Calcular horários disponíveis para n8n (baseado no horário do profissional)
app.get('/disponibilidade/:profissional_id', validateClinicaHeader, async (req, res) => {
  const { profissional_id } = req.params;
  const { data } = req.query;
  if (!data) return res.status(400).json({ error: 'Data é obrigatória' });

  try {
    const profResult = await pool.query(
      'SELECT * FROM profissionais WHERE id = $1 AND clinica_id = $2',
      [profissional_id, req.clinica_id]
    );
    
    if (profResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profissional não encontrado' });
    }

    const prof = profResult.rows[0];
    
    const agendamentosResult = await pool.query(`
      SELECT TO_CHAR(data_hora, 'HH24:MI') as hora
      FROM agendamentos 
      WHERE clinica_id = $1 
      AND profissional_id = $2 
      AND DATE(data_hora) = $3
    `, [req.clinica_id, profissional_id, data]);
    
    const ocupados = agendamentosResult.rows.map(r => r.hora);
    
    const diaSemana = new Date(data).toLocaleDateString('pt-BR', { weekday: 'lowercase' });
    const diasPermitidos = prof.dias_trabalho ? prof.dias_trabalho.split(',') : [];
    
    if (!diasPermitidos.includes(diaSemana)) {
      return res.json({ 
        disponivel: false, 
        mensagem: `Profissional não atende neste dia (${diaSemana})`,
        horarios: [] 
      });
    }

    const horariosLivres = [];
    if (prof.horario_inicio && prof.horario_fim) {
      let atual = prof.horario_inicio;
      const fim = prof.horario_fim;
      const duracao = prof.duracao_atendimento || 50;
      
      while (atual < fim) {
        const horaStr = atual.substring(0, 5);
        
        let isOcupado = ocupados.includes(horaStr);
        
        if (prof.almoco_inicio && prof.almoco_fim) {
          if (atual >= prof.almoco_inicio && atual < prof.almoco_fim) {
            isOcupado = true;
          }
        }
        
        if (!isOcupado) {
          horariosLivres.push(horaStr);
        }
        
        const [h, m] = atual.split(':').map(Number);
        const totalMinutos = h * 60 + m + duracao;
        const newH = Math.floor(totalMinutos / 60);
        const newM = totalMinutos % 60;
        atual = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
      }
    }

    res.json({
      disponivel: horariosLivres.length > 0,
      profissional: prof.nome,
      duracao_atendimento: prof.duracao_atendimento || 50,
      horarios: horariosLivres,
      ocupado: ocupados.length,
      almoco_inicio: prof.almoco_inicio ? prof.almoco_inicio.substring(0, 5) : null,
      almoco_fim: prof.almoco_fim ? prof.almoco_fim.substring(0, 5) : null,
      horario_trabalho: `${prof.horario_inicio ? prof.horario_inicio.substring(0, 5) : ''} às ${prof.horario_fim ? prof.horario_fim.substring(0, 5) : ''}`
    });
  } catch (error) {
    console.error('SERVER ERROR:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar todos os agendamentos da clínica
app.get('/agendamentos', validateClinicaHeader, async (req, res) => {
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
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Criar agendamento
app.post('/agendamentos', validateClinicaHeader, async (req, res) => {
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
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Atualizar agendamento
app.put('/agendamentos/:id', validateClinicaHeader, async (req, res) => {
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
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

// Excluir agendamento
app.delete('/agendamentos/:id', validateClinicaHeader, async (req, res) => {
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
    res.status(500).json({ 
      error: error.message || 'Erro interno desconhecido',
      details: error.code || null
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Mente Nexus rodando na porta ${PORT}`);
});
