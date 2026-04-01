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
  LogOut
} from 'lucide-react';
import './App.css';
import CalendarComponent from './components/CalendarComponent';
import Login from './components/Login';

const CLINICA_ID = '5511999999999'; // Exemplo de ID da clÃ­nica
const API_URL = 'http://jsceqezyy86wb3mz6pojr7kr.72.60.11.33.sslip.io/api';

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
  status?: string;
  ultima?: string;
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'Clientes') {
      fetchClientes();
    }
  }, [activeTab]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/clientes`, {
        headers: { 'X-Clinica-ID': CLINICA_ID }
      });
      const data = await response.json();
      setClientes(data);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (loading && activeTab !== 'Agenda') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Loader2 className="animate-spin" size={48} color="var(--accent-color)" />
        </div>
      );
    }

    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="dashboard-grid">
            <div className="glass-card">
              <h3>Agendamentos de Hoje</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Resumo da sua clÃ­nica hoje.</p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                <span className="status-badge status-check">8 Realizados</span>
                <span className="status-badge status-pending">4 Pendentes</span>
              </div>
            </div>
            <div className="glass-card">
              <h3>Novos Clientes (MÃªs)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>+48</div>
              <p style={{ color: '#4ade80', fontSize: '0.8rem' }}>â†‘ 12% em relaÃ§Ã£o ao mÃªs anterior</p>
            </div>
            <div className="glass-card">
              <h3>Status da AutomaÃ§Ã£o</h3>
              <div style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 10, height: 10, background: '#4ade80', borderRadius: '50%' }}></div>
                Online - WhatsApp Conectado
              </div>
            </div>
          </div>
        );
      case 'Agenda':
        return (
          <div className="agenda-container animate-fade-in">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2>Agenda de Atendimentos</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Gerencie seus horÃ¡rios de forma visual.</p>
              </div>
              <button className="nav-item" style={{ padding: '0.8rem 1.2rem', background: 'var(--accent-color)', color: 'black', fontWeight: 'bold' }}>
                <Plus size={20}/> Novo Agendamento
              </button>
            </div>
            <CalendarComponent />
          </div>
        );
      case 'Clientes':
        return (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>GestÃ£o de Clientes</h2>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '5px 15px', alignItems: 'center', gap: '10px' }}>
                <Search size={16} color="var(--text-secondary)"/>
                <input type="text" placeholder="Buscar cliente..." style={{ background: 'none', border: 'none', color: 'white', outline: 'none' }} />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width:32, height:32, background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold' }}>{c.nome[0]}</div>
                        {c.nome}
                      </div>
                    </td>
                    <td>{c.telefone}</td>
                    <td>{c.email || '-'}</td>
                    <td>
                      <span className={`status-badge status-check`}>
                        Ativo
                      </span>
                    </td>
                    <td><MoreHorizontal size={18} cursor="pointer" color="var(--text-secondary)"/></td>
                  </tr>
                ))}
                {clientes.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center' }}>Nenhum cliente cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div>Em breve...</div>;
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
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'Agenda' ? 'active' : ''}`} onClick={() => setActiveTab('Agenda')}>
            <Calendar size={20} /> Agenda
          </div>
          <div className={`nav-item ${activeTab === 'Clientes' ? 'active' : ''}`} onClick={() => setActiveTab('Clientes')}>
            <Users size={20} /> Clientes
          </div>
          <div className={`nav-item ${activeTab === 'Configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('Configuracoes')}>
            <Settings size={20} /> ConfiguraÃ§Ãµes
          </div>
          <div className="nav-item logout-item" onClick={() => setIsLoggedIn(false)} style={{ marginTop: '2rem', color: '#ef4444' }}>
            <LogOut size={20} /> Sair
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filtro ClÃ­nica:</div>
          <div style={{ fontWeight: '600' }}>{CLINICA_ID}</div>
        </div>
      </nav>

      <main className="main-area">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h1>{activeTab}</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Mente Nexus - Sistema de AutomaÃ§Ã£o Inteligente</p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
             <div style={{ position: 'relative', cursor: 'pointer' }}>
                <Bell size={24} color="var(--text-secondary)"/>
                <div style={{ position:'absolute', top: 0, right: 0, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-color)' }}></div>
             </div>
             <Clock size={24} color="var(--text-secondary)"/>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default App;

