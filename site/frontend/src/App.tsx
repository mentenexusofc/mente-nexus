import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import './App.css';
import CalendarComponent from './components/CalendarComponent';
import Login from './components/Login';

const CLINICA_ID = '5537998145228';
const API_URL = 'http://jsceqezyy86wb3mz6pojr7kr.72.60.11.33.sslip.io/api';

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

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn, activeTab]);

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
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Resumo da sua clÃ­nica hoje.</p>
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
              <h3>Status da AutomaÃ§Ã£o</h3>
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
                <p style={{ color: 'var(--text-secondary)' }}>Gerencie horÃ¡rios e profissionais.</p>
              </div>
              <button className="nav-item active" style={{ padding: '0.8rem 1.5rem' }}>
                <Plus size={20}/> Novo HorÃ¡rio
              </button>
            </div>
            <CalendarComponent clinicaId={CLINICA_ID} />
          </div>
        );
      case 'Clientes':
        return (
          <div className="glass-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2>GestÃ£o de Clientes</h2>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '8px 16px', alignItems: 'center', gap: '12px' }}>
                <Search size={18} color="var(--text-secondary)"/>
                <input type="text" placeholder="Filtrar por nome..." style={{ background: 'none', border: 'none', color: 'white', outline: 'none', width: '200px' }} />
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
                {clientes.map(c => (
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
                {clientes.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>Nenhum cliente disponÃ­vel.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div className="glass-card animate-fade-in">MÃ³dulo em desenvolvimento...</div>;
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
          <div className={`nav-item ${activeTab === 'Configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('Configuracoes')}>
            <Settings size={22} /> ConfiguraÃ§Ãµes
          </div>
          <div className="nav-item logout-item" onClick={() => setIsLoggedIn(false)} style={{ marginTop: '3rem', color: '#ef4444' }}>
            <LogOut size={22} /> Sair
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Filtro ClÃ­nica:</div>
          <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--accent-color)' }}>{CLINICA_ID}</div>
        </div>
      </nav>

      <main className="main-area">
        <header className="header">
          <div>
            <h1>{activeTab}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Plataforma Inteligente de GestÃ£o ClÃ­nica</p>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
             <div className="header-icon">
                <Bell size={22} color="var(--text-secondary)"/>
             </div>
             <div className="header-icon">
                <Clock size={22} color="var(--text-secondary)"/>
             </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default App;
