import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Settings, 
  Search, 
  Plus, 
  MoreHorizontal,
  Bell,
  Clock,
  Loader2,
  LogOut,
  X,
  UserPlus
} from 'lucide-react';
import './App.css';
import CalendarComponent from './components/CalendarComponent';
import Login from './components/Login';

const CLINICA_ID = '5537998145228';
const API_URL = import.meta.env.VITE_API_URL || 'https://api.mentenexus.tech';

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  status?: string;
}

interface Agendamento {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  data_hora: string;
  status: string;
}

interface Profissional {
  id: number;
  nome: string;
  area?: string;
  diasTrabalho?: string[];
  horariosTrabalho?: string;
  capacidadeAtendimento?: number;
}

interface Notificacao {
  id: number;
  titulo: string;
  mensagem: string;
  lida: boolean;
  data: string;
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [showNotificacoes, setShowNotificacoes] = useState(false);
  const [showModalNovoHorario, setShowModalNovoHorario] = useState(false);
  const [showModalNovoCliente, setShowModalNovoCliente] = useState(false);
  const [showModalNovoProfissional, setShowModalNovoProfissional] = useState(false);
  const [clienteFilter, setClienteFilter] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);

  const [novoHorario, setNovoHorario] = useState({ cliente_id: '', profissional_id: '', data_hora: '', status: 'pendente', observacoes: '' });
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '' });
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', area: '', diasTrabalho: [], horariosTrabalho: '', capacidadeAtendimento: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      fetchProfissionais();
      loadNotificacoes();
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotificacoes(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'X-Clinica-ID': CLINICA_ID };
      const [cliRes, agendaRes] = await Promise.all([
        fetch(`${API_URL}/clientes`, { headers }),
        fetch(`${API_URL}/agendamentos`, { headers })
      ]);
      const cliData = await cliRes.json();
      const agendaData = await agendaRes.json();
      setClientes(Array.isArray(cliData) ? cliData : []);
      setAgendamentos(Array.isArray(agendaData) ? agendaData : []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfissionais = async () => {
    try {
      const res = await fetch(`${API_URL}/profissionais`, { headers: { 'X-Clinica-ID': CLINICA_ID } });
      const data = await res.json();
      setProfissionais(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    }
  };

  const loadNotificacoes = () => {
    const pendentes = agendamentos.filter(a => a.status === 'pendente').length;
    const hoje = new Date();
    const hojeAgendamentos = agendamentos.filter(a => {
      const d = new Date(a.data_hora);
      return d.toDateString() === hoje.toDateString();
    });
    const notifs: Notificacao[] = [
      { id: 1, titulo: 'Agendamentos pendentes', mensagem: `${pendentes} agendamento(s) aguardando confirmação`, lida: false, data: new Date().toISOString() },
      ...hojeAgendamentos.slice(0, 3).map((a, i) => ({
        id: i + 2,
        titulo: `Consulta hoje: ${a.cliente_nome}`,
        mensagem: `Horário: ${new Date(a.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        lida: false,
        data: new Date().toISOString()
      }))
    ];
    setNotificacoes(notifs);
  };

  const marcarNotificacaoLida = (id: number) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const marcarTodasLidas = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const handleCriarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': CLINICA_ID },
        body: JSON.stringify(novoHorario)
      });
      if (res.ok) {
        setShowModalNovoHorario(false);
        setNovoHorario({ cliente_id: '', profissional_id: '', data_hora: '', status: 'pendente', observacoes: '' });
        fetchData();
        loadNotificacoes();
      } else {
        const errorData = await res.json();
        alert('Erro ao criar agendamento: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      alert('Erro de conexão ao criar agendamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCriarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': CLINICA_ID },
        body: JSON.stringify(novoCliente)
      });
      if (res.ok) {
        setShowModalNovoCliente(false);
        setNovoCliente({ nome: '', telefone: '', email: '' });
        fetchData();
      } else {
        const errorData = await res.json();
        alert('Erro ao criar cliente: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      alert('Erro de conexão ao criar cliente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCriarProfissional = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Convert array to comma-separated string for storage
      const profissionalData = {
        ...novoProfissional,
        diasTrabalho: novoProfissional.diasTrabalho.join(',')
      };
      
      const res = await fetch(`${API_URL}/profissionais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': CLINICA_ID },
        body: JSON.stringify(profissionalData)
      });
      if (res.ok) {
        setShowModalNovoProfissional(false);
        setNovoProfissional({ nome: '', area: '', diasTrabalho: [], horariosTrabalho: '', capacidadeAtendimento: 1 });
        fetchProfissionais(); // Refresh the professionals list
      } else {
        const errorData = await res.json();
        alert('Erro ao criar profissional: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao criar profissional:', error);
      alert('Erro de conexão ao criar profissional');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(clienteFilter.toLowerCase())
  );

  const dashboardData = () => {
    const hojeStart = new Date();
    hojeStart.setHours(0,0,0,0);
    const hojeEnd = new Date();
    hojeEnd.setHours(23,59,59,999);
    
    const hoje = agendamentos.filter(a => {
      const d = new Date(a.data_hora);
      return d >= hojeStart && d <= hojeEnd;
    });

    const realizados = hoje.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
    const pendentes = hoje.filter(a => a.status !== 'confirmado' && a.status !== 'concluido').length;

    return { realizados, pendentes, totalClientes: clientes.length };
  };

  const renderContent = () => {
    if (loading && activeTab !== 'Agenda') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--accent-color)" />
        </div>
      );
    }

    const { realizados, pendentes, totalClientes } = dashboardData();

     switch (activeTab) {
       case 'Dashboard':
         return (
           <div className="dashboard-grid animate-fade-in">
             <div className="glass-card">
               <h3>Agendamentos de Hoje</h3>
               <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Resumo da sua clínica hoje.</p>
               <div style={{ display: 'flex', gap: '15px' }}>
                 <span className="status-badge status-check">{realizados} Realizados</span>
                 <span className="status-badge status-pending">{pendentes} Pendentes</span>
               </div>
             </div>
             <div className="glass-card">
               <h3>Total de Clientes</h3>
               <div style={{ fontSize: '2.5rem', fontWeight: '800', margin: '1rem 0' }}>{totalClientes}</div>
               <p style={{ color: '#4ade80', fontSize: '0.85rem' }}>Cadastrados na base Mente Nexus</p>
             </div>
             <div className="glass-card">
               <h3>Status da Automação</h3>
               <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <div style={{ width: 12, height: 12, background: '#4ade80', borderRadius: '50%', boxShadow: '0 0 10px #4ade80' }}></div>
                 <span style={{ fontWeight: 600 }}>Online - WhatsApp Conectado</span>
               </div>
             </div>
           </div>
         );
       case 'Agenda':
         return (
           <div className="agenda-container animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <div>
                 <h2>Agenda de Atendimentos</h2>
                 <p style={{ color: 'var(--text-secondary)' }}>Gerencie horários e profissionais.</p>
               </div>
               <button className="nav-item active" style={{ padding: '0.8rem 1.5rem' }} onClick={() => setShowModalNovoHorario(true)}>
                 <Plus size={20}/> Novo Horário
               </button>
             </div>
             <CalendarComponent clinicaId={CLINICA_ID} />
           </div>
         );
       case 'Clientes':
         return (
           <div className="glass-card animate-fade-in">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h2>Gestão de Clientes</h2>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px 16px', alignItems: 'center', gap: '12px' }}>
                   <Search size={18} color="var(--text-secondary)"/>
                   <input type="text" placeholder="Filtrar por nome..." value={clienteFilter} onChange={(e) => setClienteFilter(e.target.value)} style={{ background: 'none', border: 'none', color: 'white', outline: 'none', width: '200px' }} />
                 </div>
                 <button className="nav-item active" style={{ padding: '0.8rem 1.5rem' }} onClick={() => setShowModalNovoCliente(true)}>
                   <UserPlus size={20}/> Novo Cliente
                 </button>
               </div>
             </div>
             <table>
               <thead>
                 <tr>
                   <th>Nome do Cliente</th>
                   <th>Telefone / WhatsApp</th>
                   <th>E-mail</th>
                   <th>Status</th>
                   <th></th>
                 </tr>
               </thead>
               <tbody>
                 {clientesFiltrados.map(c => (
                   <tr key={c.id}>
                     <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <div style={{ width:36, height:36, background: 'var(--accent-color)', borderRadius: '10px', display: 'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', color: 'white' }}>{(c.nome || '?')[0]}</div>
                         <span style={{ fontWeight: 600 }}>{c.nome}</span>
                       </div>
                     </td>
                     <td>{c.telefone}</td>
                     <td>{c.email || '-'}</td>
                     <td>
                       <span className="status-badge status-check">Ativo</span>
                     </td>
                     <td><MoreHorizontal size={20} cursor="pointer" color="var(--text-secondary)"/></td>
                   </tr>
                 ))}
                 {clientesFiltrados.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>Nenhum cliente disponível.</td></tr>}
               </tbody>
             </table>
           </div>
         );
       case 'Profissionais':
         return (
           <div className="glass-card animate-fade-in">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h2>Gestão de Profissionais</h2>
               <button className="nav-item active" style={{ padding: '0.8rem 1.5rem' }} onClick={() => setShowModalNovoProfissional(true)}>
                 <UserPlus size={20}/> Novo Profissional
               </button>
             </div>
             <table>
               <thead>
                 <tr>
                   <th>Nome</th>
                   <th>Área/Especialidade</th>
                   <th>Dias de Trabalho</th>
                   <th>Horário de Trabalho</th>
                   <th>Capacidade</th>
                   <th></th>
                 </tr>
               </thead>
               <tbody>
                 {profissionais.map(p => (
                   <tr key={p.id}>
                     <td>{p.nome}</td>
                     <td>{p.area || '-'}</td>
                     <td>
                       {p.diasTrabalho && p.diasTrabalho.length > 0 ? (
                         <span>{p.diasTrabalho.map(d => d).join(', ')}</span>
                       ) : (
                         <span>-</span>
                       )}
                     </td>
                     <td>{p.horariosTrabalho || '-'}</td>
                     <td>{p.capacidadeAtendimento || 1}</td>
                     <td><MoreHorizontal size={20} cursor="pointer" color="var(--text-secondary)"/></td>
                   </tr>
                 ))}
                 {profissionais.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>Nenhum profissional disponível.</td></tr>}
               </tbody>
             </table>
           </div>
         );
       default:
         return <div className="glass-card animate-fade-in">Módulo em desenvolvimento...</div>;
     }
  };

  if (!isLoggedIn) {
    return <Login onLogin={setIsLoggedIn} />;
  }

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo-container">MENTE NEXUS</div>
        <div className="nav-menu">
          <div className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('Dashboard')}>
            <LayoutDashboard size={22} /> Painel
          </div>
          <div className={`nav-item ${activeTab === 'Agenda' ? 'active' : ''}`} onClick={() => setActiveTab('Agenda')}>
            <Calendar size={22} /> Agenda
          </div>
          <div className={`nav-item ${activeTab === 'Clientes' ? 'active' : ''}`} onClick={() => setActiveTab('Clientes')}>
            <Users size={22} /> Clientes
          </div>
          <div className={`nav-item ${activeTab === 'Profissionais' ? 'active' : ''}`} onClick={() => setActiveTab('Profissionais')}>
            <Users size={22} /> Profissionais
          </div>
          <div className={`nav-item ${activeTab === 'Configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('Configuracoes')}>
            <Settings size={22} /> Configurações
          </div>
          <div className="nav-item logout-item" onClick={() => setIsLoggedIn(false)} style={{ marginTop: '3rem', color: '#ef4444' }}>
            <LogOut size={22} /> Sair
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Filtro Clínica:</div>
          <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--accent-color)' }}>{CLINICA_ID}</div>
        </div>
      </nav>

      <main className="main-area">
        <header className="header">
          <div>
            <h1>{activeTab}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Plataforma Inteligente de Gestão Clínica</p>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
             <div className="header-icon" style={{ position: 'relative' }} onClick={() => setShowNotificacoes(!showNotificacoes)} ref={notifRef}>
                <Bell size={22} color="var(--text-secondary)"/>
                {naoLidas > 0 && (
                  <div style={{ position: 'absolute', top: -5, right: -5, width: 20, height: 20, background: '#ef4444', borderRadius: '50%', color: 'white', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid var(--bg-color)' }}>
                    {naoLidas}
                  </div>
                )}
                
                {showNotificacoes && (
                  <div className="glass-card animate-fade-in notification-dropdown" style={{ position: 'fixed', top: '60px', right: '10px', width: 'min(320px, calc(100vw - 20px))', zIndex: 1001, padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: 'white' }}>Notificações</h4>
                      <button onClick={marcarTodasLidas} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.75rem', cursor: 'pointer' }}>Marcar todas como lidas</button>
                    </div>
                    {notificacoes.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>Nenhuma notificação</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {notificacoes.map(n => (
                          <div key={n.id} onClick={() => marcarNotificacaoLida(n.id)} style={{ padding: '0.75rem', borderRadius: '10px', background: n.lida ? 'rgba(255,255,255,0.02)' : 'rgba(59, 130, 246, 0.1)', cursor: 'pointer', border: n.lida ? '1px solid transparent' : '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px', color: n.lida ? 'var(--text-secondary)' : 'white' }}>{n.titulo}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.mensagem}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>
             <div className="header-icon">
                <Clock size={22} color="var(--text-secondary)"/>
             </div>
          </div>
        </header>

        {renderContent()}

      {showModalNovoHorario && (
        <div className="modal-overlay" onClick={() => setShowModalNovoHorario(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Novo Horário</h2>
              <button className="modal-close" onClick={() => setShowModalNovoHorario(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCriarHorario}>
              <div className="form-group">
                <label>Cliente</label>
                <select 
                  value={novoHorario.cliente_id} 
                  onChange={e => setNovoHorario({ ...novoHorario, cliente_id: e.target.value })}
                  required
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Profissional</label>
                <select 
                  value={novoHorario.profissional_id} 
                  onChange={e => setNovoHorario({ ...novoHorario, profissional_id: e.target.value })}
                  required
                >
                  <option value="">Selecione um profissional</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} {p.especialidade ? `(${p.especialidade})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Data e Hora</label>
                <input 
                  type="datetime-local" 
                  value={novoHorario.data_hora} 
                  onChange={e => setNovoHorario({ ...novoHorario, data_hora: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={novoHorario.status} 
                  onChange={e => setNovoHorario({ ...novoHorario, status: e.target.value })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div className="form-group">
                <label>Observações</label>
                <textarea 
                  value={novoHorario.observacoes} 
                  onChange={e => setNovoHorario({ ...novoHorario, observacoes: e.target.value })}
                  rows={3}
                  placeholder="Observações adicionais..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalNovoHorario(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : <><Plus size={18} /> Criar Horário</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalNovoCliente && (
        <div className="modal-overlay" onClick={() => setShowModalNovoCliente(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Novo Cliente</h2>
              <button className="modal-close" onClick={() => setShowModalNovoCliente(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCriarCliente}>
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  value={novoCliente.nome} 
                  onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })}
                  required
                  placeholder="Nome completo"
                />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <input 
                  type="tel" 
                  value={novoCliente.telefone} 
                  onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })}
                  required
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input 
                  type="email" 
                  value={novoCliente.email} 
                  onChange={e => setNovoCliente({ ...novoCliente, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalNovoCliente(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : <><UserPlus size={18} /> Criar Cliente</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showModalNovoProfissional && (
        <div className="modal-overlay" onClick={() => setShowModalNovoProfissional(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Novo Profissional</h2>
              <button className="modal-close" onClick={() => setShowModalNovoProfissional(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCriarProfissional}>
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  value={novoProfissional.nome} 
                  onChange={e => setNovoProfissional({ ...novoProfissional, nome: e.target.value })}
                  required
                  placeholder="Nome completo"
                />
              </div>
              <div className="form-group">
                <label>Área/Especialidade</label>
                <input 
                  type="text" 
                  value={novoProfissional.area} 
                  onChange={e => setNovoProfissional({ ...novoProfissional, area: e.target.value })}
                  placeholder="Ex: Psicologia, Fisioterapia, Nutrição"
                />
              </div>
              <div className="form-group">
                <label>Dias da Semana que Trabalha</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="segunda" 
                      checked={novoProfissional.diasTrabalho.includes('segunda')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('segunda');
                        } else {
                          const index = dias.indexOf('segunda');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Segunda
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="terca" 
                      checked={novoProfissional.diasTrabalho.includes('terca')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('terca');
                        } else {
                          const index = dias.indexOf('terca');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Terça
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="quarta" 
                      checked={novoProfissional.diasTrabalho.includes('quarta')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('quarta');
                        } else {
                          const index = dias.indexOf('quarta');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Quarta
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="quinta" 
                      checked={novoProfissional.diasTrabalho.includes('quinta')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('quinta');
                        } else {
                          const index = dias.indexOf('quinta');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Quinta
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="sexta" 
                      checked={novoProfissional.diasTrabalho.includes('sexta')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('sexta');
                        } else {
                          const index = dias.indexOf('sexta');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Sexta
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="sabado" 
                      checked={novoProfissional.diasTrabalho.includes('sabado')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('sabado');
                        } else {
                          const index = dias.indexOf('sabado');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Sábado
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input 
                      type="checkbox" 
                      value="domingo" 
                      checked={novoProfissional.diasTrabalho.includes('domingo')}
                      onChange={e => {
                        const dias = [...novoProfissional.diasTrabalho];
                        if (e.target.checked) {
                          dias.push('domingo');
                        } else {
                          const index = dias.indexOf('domingo');
                          if (index > -1) dias.splice(index, 1);
                        }
                        setNovoProfissional({ ...novoProfissional, diasTrabalho: dias });
                      }}
                    />
                    Domingo
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Horário de Trabalho</label>
                <input 
                  type="text" 
                  value={novoProfissional.horariosTrabalho} 
                  onChange={e => setNovoProfissional({ ...novoProfissional, horariosTrabalho: e.target.value })}
                  placeholder="Ex: 08:00 às 18:00"
                />
              </div>
              <div className="form-group">
                <label>Quantidade de Pessoas de Uma Vez</label>
                <input 
                  type="number" 
                  min="1"
                  value={novoProfissional.capacidadeAtendimento} 
                  onChange={e => setNovoProfissional({ ...novoProfissional, capacidadeAtendimento: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalNovoProfissional(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Criando...' : <><UserPlus size={18} /> Criar Profissional</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </main>
    </div>
  );
};

export default App;
