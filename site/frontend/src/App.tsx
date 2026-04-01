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
  Loader2,
  Check,
  Trash2,
  Building2,
  LogOut,
  Stethoscope,
  X,
  Menu
} from 'lucide-react';
import './App.css';
import CalendarComponent from './components/CalendarComponent';
import Login from './components/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://jsceqezyy86wb3mz6pojr7kr.72.60.11.33.sslip.io/api';

interface Clinica {
  id: string;
  nome: string;
  email: string;
}

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
  email?: string;
}

interface Profissional {
  id: number;
  nome: string;
  especialidade: string;
}

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [selectedClinicaId, setSelectedClinicaId] = useState('5511999999999');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal States
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProfModalOpen, setIsProfModalOpen] = useState(false);
  const [isClinicaModalOpen, setIsClinicaModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [editingProf, setEditingProf] = useState<Profissional | null>(null);

  // Form States
  const [clientForm, setClientForm] = useState({ nome: '', telefone: '', email: '' });
  const [profForm, setProfForm] = useState({ nome: '', especialidade: '' });
  const [clinicaForm, setClinicaForm] = useState({ id: '', nome: '', email: '' });

  const fetchClinicas = async () => {
    try {
      const response = await fetch(`${API_URL}/clinicas`);
      setClinicas(await response.json());
    } catch (error) { console.error('Erro ao buscar clínicas:', error); }
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (isAdmin) fetchClinicas();
      if (activeTab === 'Clientes') fetchClientes();
      if (activeTab === 'Profissionais') fetchProfissionais();
    }
  }, [isLoggedIn, activeTab, selectedClinicaId, isAdmin]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/clientes`, {
        headers: { 'X-Clinica-ID': selectedClinicaId }
      });
      setClientes(await response.json());
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfissionais = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/profissionais`, {
        headers: { 'X-Clinica-ID': selectedClinicaId }
      });
      setProfissionais(await response.json());
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingClient ? 'PUT' : 'POST';
    const url = editingClient ? `${API_URL}/clientes/${editingClient.id}` : `${API_URL}/clientes`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': selectedClinicaId },
        body: JSON.stringify(clientForm)
      });
      if (res.ok) {
        setIsClientModalOpen(false);
        fetchClientes();
      } else {
        const errorData = await res.json();
        alert(`Erro: ${errorData.error || 'Falha ao salvar cliente'}`);
      }
    } catch (error) { 
      console.error(error); 
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm('Excluir cliente?')) return;
    try {
      await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
        headers: { 'X-Clinica-ID': selectedClinicaId }
      });
      fetchClientes();
    } catch (error) { console.error(error); }
  };

  const handleSaveProf = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingProf ? 'PUT' : 'POST';
    const url = editingProf ? `${API_URL}/profissionais/${editingProf.id}` : `${API_URL}/profissionais`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': selectedClinicaId },
        body: JSON.stringify(profForm)
      });
      if (res.ok) {
        setIsProfModalOpen(false);
        fetchProfissionais();
      } else {
        const errorData = await res.json();
        alert(`Erro: ${errorData.error || 'Falha ao salvar profissional'}`);
      }
    } catch (error) { 
      console.error(error); 
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleDeleteProf = async (id: number) => {
    if (!window.confirm('Excluir profissional?')) return;
    try {
      await fetch(`${API_URL}/profissionais/${id}`, {
        method: 'DELETE',
        headers: { 'X-Clinica-ID': selectedClinicaId }
      });
      fetchProfissionais();
    } catch (error) { console.error(error); }
  };

  const handleSaveClinica = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/clinicas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinicaForm)
      });
      if (res.ok) {
        setIsClinicaModalOpen(false);
        setClinicaForm({ id: '', nome: '', email: '' });
        fetchClinicas();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao salvar clínica');
      }
    } catch (error) { console.error(error); }
  };

  const handleDeleteClinica = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir esta clínica e TODOS os seus dados associados?')) return;
    try {
      await fetch(`${API_URL}/clinicas/${id}`, { method: 'DELETE' });
      fetchClinicas();
    } catch (error) { console.error(error); }
  };

  const openClientModal = (client: Cliente | null = null) => {
    setEditingClient(client);
    setClientForm(client ? { nome: client.nome, telefone: client.telefone, email: client.email || '' } : { nome: '', telefone: '', email: '' });
    setIsClientModalOpen(true);
  };

  const openProfModal = (prof: Profissional | null = null) => {
    setEditingProf(prof);
    setProfForm(prof ? { nome: prof.nome, especialidade: prof.especialidade || '' } : { nome: '', especialidade: '' });
    setIsProfModalOpen(true);
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
                <span className="status-badge status-check">0 Realizados</span>
                <span className="status-badge status-pending">0 Pendentes</span>
              </div>
            </div>
            <div className="glass-card">
              <h3>Novos Clientes (Mês)</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>0</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Sem clientes no mês atual</p>
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
            </div>
            <CalendarComponent clinicaId={selectedClinicaId} />
          </div>
        );
      case 'Clientes':
        return (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Gestão de Clientes</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '5px 15px', alignItems: 'center', gap: '10px' }}>
                  <Search size={16} color="var(--text-secondary)"/>
                  <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ background: 'none', border: 'none', color: 'white', outline: 'none' }} />
                </div>
                <button className="nav-item active" style={{ padding: '0 15px' }} onClick={() => openClientModal()}>
                  <Plus size={18}/> Novo Cliente
                </button>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>E-mail</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width:32, height:32, background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color: 'black' }}>{c.nome[0]}</div>
                        {c.nome}
                      </div>
                    </td>
                    <td>{c.telefone}</td>
                    <td>{c.email || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <MoreHorizontal size={18} cursor="pointer" color="var(--text-secondary)" onClick={() => openClientModal(c)}/>
                        <Trash2 size={18} cursor="pointer" color="#ef4444" onClick={() => handleDeleteClient(c.id)}/>
                      </div>
                    </td>
                  </tr>
                ))}
                {clientes.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center' }}>Nenhum cliente cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case 'Profissionais':
        return (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Corpo Clínico</h2>
              <button className="nav-item active" style={{ padding: '0 15px' }} onClick={() => openProfModal()}>
                <Plus size={18}/> Novo Profissional
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Especialidade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {profissionais.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width:32, height:32, background: '#a855f7', borderRadius: '50%', display: 'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color: 'white' }}>{p.nome[0]}</div>
                        {p.nome}
                      </div>
                    </td>
                    <td>{p.especialidade}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <MoreHorizontal size={18} cursor="pointer" color="var(--text-secondary)" onClick={() => openProfModal(p)}/>
                        <Trash2 size={18} cursor="pointer" color="#ef4444" onClick={() => handleDeleteProf(p.id)}/>
                      </div>
                    </td>
                  </tr>
                ))}
                {profissionais.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center' }}>Nenhum profissional cadastrado.</td></tr>}
              </tbody>
            </table>
          </div>
        );
      case 'Clínicas':
        return (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Gestão de Clínicas</h2>
              <button className="nav-item active" style={{ padding: '0 15px' }} onClick={() => setIsClinicaModalOpen(true)}>
                <Plus size={18}/> Nova Clínica
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>ID (Telefone)</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clinicas.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.nome}</td>
                    <td>{c.email}</td>
                    <td>
                      <button onClick={() => handleDeleteClinica(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return <div>Em breve...</div>;
    }
  };

  const handleLoginSuccess = (success: boolean, email: string) => {
    if (success) {
      setIsLoggedIn(true);
      setIsAdmin(email === 'mentenexus.ia@gmail.com');
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">MENTE NEXUS</div>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}><X size={20}/></button>
        </div>
        <div className="nav-menu">
          <div className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('Dashboard'); setSidebarOpen(false); }}>
            <LayoutDashboard size={20} /> Dashboard
          </div>
          <div className={`nav-item ${activeTab === 'Agenda' ? 'active' : ''}`} onClick={() => { setActiveTab('Agenda'); setSidebarOpen(false); }}>
            <Calendar size={20} /> Agenda
          </div>
          <div className={`nav-item ${activeTab === 'Clientes' ? 'active' : ''}`} onClick={() => { setActiveTab('Clientes'); setSidebarOpen(false); }}>
            <Users size={20} /> Clientes
          </div>
          <div className={`nav-item ${activeTab === 'Profissionais' ? 'active' : ''}`} onClick={() => { setActiveTab('Profissionais'); setSidebarOpen(false); }}>
            <Stethoscope size={20} /> Profissionais
          </div>
          {isAdmin && (
            <div className={`nav-item ${activeTab === 'Clínicas' ? 'active' : ''}`} onClick={() => { setActiveTab('Clínicas'); setSidebarOpen(false); }}>
              <Building2 size={20} /> Clínicas
            </div>
          )}
          <div className={`nav-item ${activeTab === 'Configuracoes' ? 'active' : ''}`} onClick={() => { setActiveTab('Configuracoes'); setSidebarOpen(false); }}>
            <Settings size={20} /> Configurações
          </div>
          <div className="nav-item logout-item" onClick={() => setIsLoggedIn(false)} style={{ marginTop: '2rem', color: '#ef4444' }}>
            <LogOut size={20} /> Sair
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Clínica ID:</div>
          <div style={{ fontWeight: '600' }}>{selectedClinicaId}</div>
        </div>
      </nav>

      <main className="main-area">
        <header className="header">
          <div className="header-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24}/>
            </button>
            <div>
              <h1>{activeTab}</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Mente Nexus - Painel Administrativo</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {isAdmin && (
               <select 
               value={selectedClinicaId} 
               onChange={(e) => setSelectedClinicaId(e.target.value)}
               className="glass-card"
               style={{
                 background: 'rgba(255,255,255,0.05)',
                 border: '1px solid var(--border-color)',
                 color: 'white',
                 padding: '8px 12px',
                 borderRadius: '10px',
                 outline: 'none',
                 cursor: 'pointer'
               }}
             >
               {clinicas.map(c => (
                 <option key={c.id} value={c.id} style={{ background: '#1a1a1a' }}>{c.nome}</option>
               ))}
             </select>
            )}
             <Bell size={24} color="var(--text-secondary)" cursor="pointer"/>
          </div>
        </header>

        {renderContent()}
      </main>

      {/* Modals */}
      {isClientModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsClientModalOpen(false)} className="close-btn"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveClient}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input required value={clientForm.nome} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <input required value={clientForm.telefone} onChange={e => setClientForm({...clientForm, telefone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>E-mail (Opcional)</label>
                <input type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsClientModalOpen(false)}>Cancelar</button>
                <button type="submit" className="save-btn"><Check size={18}/> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProfModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>{editingProf ? 'Editar Profissional' : 'Novo Profissional'}</h3>
              <button onClick={() => setIsProfModalOpen(false)} className="close-btn"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveProf}>
              <div className="form-group">
                <label>Nome do Profissional</label>
                <input required value={profForm.nome} onChange={e => setProfForm({...profForm, nome: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Especialidade</label>
                <input required placeholder="Ex: Psicólogo, Nutricionista..." value={profForm.especialidade} onChange={e => setProfForm({...profForm, especialidade: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsProfModalOpen(false)}>Cancelar</button>
                <button type="submit" className="save-btn"><Check size={18}/> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isClinicaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Nova Clínica</h3>
              <button onClick={() => setIsClinicaModalOpen(false)} className="close-btn"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveClinica}>
              <div className="form-group">
                <label>ID / Telefone Responsável</label>
                <input required placeholder="5511999999999" value={clinicaForm.id} onChange={e => setClinicaForm({...clinicaForm, id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Nome da Clínica</label>
                <input required placeholder="Ex: Clínica Bem Estar" value={clinicaForm.nome} onChange={e => setClinicaForm({...clinicaForm, nome: e.target.value})} />
              </div>
              <div className="form-group">
                <label>E-mail de Contato</label>
                <input type="email" placeholder="contato@clinica.com" value={clinicaForm.email} onChange={e => setClinicaForm({...clinicaForm, email: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsClinicaModalOpen(false)}>Cancelar</button>
                <button type="submit" className="save-btn"><Check size={18}/> Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

