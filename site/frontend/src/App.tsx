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
  UserPlus,
  Pencil,
  Trash2
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
  especialidade?: string;
  diasTrabalho?: string[];
  dias_trabalho?: string;
  horario_inicio?: string;
  horario_fim?: string;
  almoco_inicio?: string;
  almoco_fim?: string;
  duracao_atendimento?: number;
  capacidade_atendimento?: number;
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
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', area: '', diasTrabalho: [] as string[], horario_inicio: '08:00', horario_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', duracao_atendimento: 50, capacidade_atendimento: 1 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingProfissional, setEditingProfissional] = useState<Profissional | null>(null);
  const [showModalEditCliente, setShowModalEditCliente] = useState(false);
  const [showModalEditProfissional, setShowModalEditProfissional] = useState(false);
  const dropdownRef = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [horariosDisponiveis, setHorariosDisponiveis] = useState<string[]>([]);
  const [profissionalInfo, setProfissionalInfo] = useState<{ duracao: number; almoco: string; horario: string } | null>(null);

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
      Object.keys(dropdownRef.current).forEach(key => {
        if (dropdownRef.current[key] && !dropdownRef.current[key]?.contains(e.target as Node)) {
          setOpenDropdown(null);
        }
      });
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

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${API_URL}/clientes`, { headers: { 'X-Clinica-ID': CLINICA_ID } });
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClientes([]);
    }
  };

  const fetchProfissionais = async () => {
    try {
      const res = await fetch(`${API_URL}/profissionais`, { headers: { 'X-Clinica-ID': CLINICA_ID } });
      if (!res.ok) throw new Error('Failed to fetch');
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setProfissionais(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      setProfissionais([]);
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
        setHorariosDisponiveis([]);
        setProfissionalInfo(null);
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

  const buscarHorariosDisponiveis = async (profissionalId: string, data: string) => {
    if (!profissionalId || !data) {
      setHorariosDisponiveis([]);
      setProfissionalInfo(null);
      return;
    }
    
    try {
      const dataFormatada = data.split('T')[0];
      const res = await fetch(`${API_URL}/disponibilidade/${profissionalId}?data=${dataFormatada}`, {
        headers: { 'X-Clinica-ID': CLINICA_ID }
      });
      
      if (res.ok) {
        const dataResult = await res.json();
        setHorariosDisponiveis(dataResult.horarios || []);
        setProfissionalInfo({
          duracao: dataResult.duracao_atendimento || 50,
          almoco: dataResult.almoco_inicio && dataResult.almoco_fim ? `${dataResult.almoco_inicio} - ${dataResult.almoco_fim}` : '',
          horario: dataResult.horario_trabalho || ''
        });
      } else {
        setHorariosDisponiveis([]);
        setProfissionalInfo(null);
      }
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      setHorariosDisponiveis([]);
      setProfissionalInfo(null);
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
      const profissionalData = {
        nome: novoProfissional.nome,
        especialidade: novoProfissional.area,
        dias_trabalho: novoProfissional.diasTrabalho.join(','),
        horario_inicio: novoProfissional.horario_inicio,
        horario_fim: novoProfissional.horario_fim,
        almoco_inicio: novoProfissional.almoco_inicio,
        almoco_fim: novoProfissional.almoco_fim,
        duracao_atendimento: novoProfissional.duracao_atendimento,
        capacidade_atendimento: novoProfissional.capacidade_atendimento
      };
      
      const res = await fetch(`${API_URL}/profissionais`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': CLINICA_ID },
        body: JSON.stringify(profissionalData)
      });
      if (res.ok) {
        setShowModalNovoProfissional(false);
        setNovoProfissional({ nome: '', area: '', diasTrabalho: [], horario_inicio: '08:00', horario_fim: '18:00', almoco_inicio: '12:00', almoco_fim: '13:00', duracao_atendimento: 50, capacidade_atendimento: 1 });
        fetchProfissionais();
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

  const handleEditarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente) return;
    setIsSubmitting(true);
    const originalShow = showModalEditCliente;
    try {
      const res = await fetch(`${API_URL}/clientes/${editingCliente.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': CLINICA_ID },
        body: JSON.stringify({ nome: editingCliente.nome, telefone: editingCliente.telefone, email: editingCliente.email || '' })
      });
      if (res.ok) {
        setShowModalEditCliente(false);
        setEditingCliente(null);
        fetchClientes();
      } else {
        setShowModalEditCliente(originalShow);
        alert('Erro ao editar cliente');
      }
    } catch (error) {
      setShowModalEditCliente(originalShow);
      console.error('Erro ao editar cliente:', error);
      alert('Erro de conexão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcluirCliente = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      const res = await fetch(`${API_URL}/clientes/${id}`, {
        method: 'DELETE',
        headers: { 'X-Clinica-ID': CLINICA_ID }
      });
      if (res.ok) {
        setOpenDropdown(null);
        fetchData();
      } else {
        alert('Erro ao excluir cliente');
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  const handleEditarProfissional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfissional) return;
    setIsSubmitting(true);
    const originalShow = showModalEditProfissional;
    try {
      const res = await fetch(`${API_URL}/profissionais/${editingProfissional.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': CLINICA_ID },
        body: JSON.stringify({
          nome: editingProfissional.nome,
          especialidade: editingProfissional.area,
          dias_trabalho: editingProfissional.diasTrabalho?.join(',') || '',
          horario_inicio: editingProfissional.horario_inicio || null,
          horario_fim: editingProfissional.horario_fim || null,
          almoco_inicio: editingProfissional.almoco_inicio || null,
          almoco_fim: editingProfissional.almoco_fim || null,
          duracao_atendimento: editingProfissional.duracao_atendimento || 50,
          capacidade_atendimento: editingProfissional.capacidade_atendimento || 1
        })
      });
      if (res.ok) {
        setShowModalEditProfissional(false);
        setEditingProfissional(null);
        fetchProfissionais();
      } else {
        setShowModalEditProfissional(originalShow);
        const errorText = await res.text();
        console.error('Erro ao editar profissional:', errorText);
        alert('Erro ao editar profissional');
      }
    } catch (error) {
      setShowModalEditProfissional(originalShow);
      console.error('Erro ao editar profissional:', error);
      alert('Erro de conexão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExcluirProfissional = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;
    try {
      const res = await fetch(`${API_URL}/profissionais/${id}`, {
        method: 'DELETE',
        headers: { 'X-Clinica-ID': CLINICA_ID }
      });
      if (res.ok) {
        setOpenDropdown(null);
        fetchProfissionais();
      } else {
        alert('Erro ao excluir profissional');
      }
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
    }
  };

  const openEditCliente = (cliente: Cliente) => {
    setEditingCliente({ ...cliente });
    setShowModalEditCliente(true);
    setOpenDropdown(null);
  };

  const openEditProfissional = (profissional: Profissional) => {
    const diasArray = profissional.diasTrabalho || (profissional as any).dias_trabalho?.split(',') || [];
    setEditingProfissional({ 
      ...profissional, 
      area: profissional.area || (profissional as any).especialidade,
      diasTrabalho: diasArray,
      horario_inicio: profissional.horario_inicio || (profissional as any).horario_inicio || '08:00',
      horario_fim: profissional.horario_fim || (profissional as any).horario_fim || '18:00',
      almoco_inicio: profissional.almoco_inicio || (profissional as any).almoco_inicio || '12:00',
      almoco_fim: profissional.almoco_fim || (profissional as any).almoco_fim || '13:00',
      duracao_atendimento: profissional.duracao_atendimento || (profissional as any).duracao_atendimento || 50,
      capacidade_atendimento: profissional.capacidade_atendimento || (profissional as any).capacidade_atendimento || 1
    });
    setShowModalEditProfissional(true);
    setOpenDropdown(null);
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
                      <td style={{ position: 'relative' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === c.id ? null : c.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                          <MoreHorizontal size={20} color="var(--text-secondary)"/>
                        </button>
                        {openDropdown === c.id && (
                          <div 
                            ref={(el) => { dropdownRef.current[`cliente-${c.id}`] = el; }}
                            className="dropdown-menu glass-card animate-fade-in"
                            style={{ position: 'absolute', right: 0, top: '100%', minWidth: '150px', zIndex: 100, padding: '0.5rem', marginTop: '4px' }}
                          >
                            <button 
                              onClick={() => openEditCliente(c)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem' }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'none'}
                            >
                              <Pencil size={16} /> Editar
                            </button>
                            <button 
                              onClick={() => handleExcluirCliente(c.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem' }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'none'}
                            >
                              <Trash2 size={16} /> Excluir
                            </button>
                          </div>
                        )}
                      </td>
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
                    <th>Horário</th>
                    <th>Almoço</th>
                    <th>Duração</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map(p => {
                    const diasTrabalho = p.diasTrabalho || (p as any).dias_trabalho?.split(',') || [];
                    const horarioInicio = p.horario_inicio || (p as any).horario_inicio || '';
                    const horarioFim = p.horario_fim || (p as any).horario_fim || '';
                    const almocoInicio = p.almoco_inicio || (p as any).almoco_inicio || '';
                    const almocoFim = p.almoco_fim || (p as any).almoco_fim || '';
                    const duracao = p.duracao_atendimento || (p as any).duracao_atendimento || 50;
                    
                    return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.nome}</td>
                      <td>{p.area || (p as any).especialidade || '-'}</td>
                      <td>
                        {diasTrabalho.length > 0 ? (
                          <span style={{ fontSize: '0.85rem' }}>{diasTrabalho.join(', ')}</span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {horarioInicio && horarioFim ? `${horarioInicio.substring(0,5)} às ${horarioFim.substring(0,5)}` : '-'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {almocoInicio && almocoFim ? `${almocoInicio.substring(0,5)} - ${almocoFim.substring(0,5)}` : '-'}
                      </td>
                      <td>{duracao} min</td>
                      <td style={{ position: 'relative' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === p.id ? null : p.id); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        >
                          <MoreHorizontal size={20} color="var(--text-secondary)"/>
                        </button>
                        {openDropdown === p.id && (
                          <div 
                            ref={(el) => { dropdownRef.current[`profissional-${p.id}`] = el; }}
                            className="dropdown-menu glass-card animate-fade-in"
                            style={{ position: 'absolute', right: 0, top: '100%', minWidth: '150px', zIndex: 100, padding: '0.5rem', marginTop: '4px' }}
                          >
                            <button 
                              onClick={() => openEditProfissional(p)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem' }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'none'}
                            >
                              <Pencil size={16} /> Editar
                            </button>
                            <button 
                              onClick={() => handleExcluirProfissional(p.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', fontSize: '0.9rem' }}
                              onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
                              onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'none'}
                            >
                              <Trash2 size={16} /> Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )})}
                  {profissionais.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>Nenhum profissional disponível.</td></tr>}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Cliente</label>
                  <select 
                    value={novoHorario.cliente_id} 
                    onChange={e => setNovoHorario({ ...novoHorario, cliente_id: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Profissional</label>
                  <select 
                    value={novoHorario.profissional_id} 
                    onChange={e => {
                      setNovoHorario({ ...novoHorario, profissional_id: e.target.value, data_hora: '' });
                      setHorariosDisponiveis([]);
                      setProfissionalInfo(null);
                      if (e.target.value && novoHorario.data_hora) {
                        buscarHorariosDisponiveis(e.target.value, novoHorario.data_hora);
                      }
                    }}
                    required
                  >
                    <option value="">Selecione</option>
                    {profissionais.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Data</label>
                <input 
                  type="date" 
                  value={novoHorario.data_hora ? novoHorario.data_hora.split('T')[0] : ''} 
                  onChange={e => {
                    const data = e.target.value;
                    setNovoHorario({ ...novoHorario, data_hora: '' });
                    if (novoHorario.profissional_id && data) {
                      buscarHorariosDisponiveis(novoHorario.profissional_id, data);
                    } else {
                      setHorariosDisponiveis([]);
                      setProfissionalInfo(null);
                    }
                  }}
                  required
                />
              </div>
              
              {profissionalInfo && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <strong>Horário:</strong> {profissionalInfo.horario}
                  </div>
                  {profissionalInfo.almoco && (
                    <div style={{ marginBottom: '0.25rem', color: '#f59e0b' }}>
                      <strong>Almoço:</strong> {profissionalInfo.almoco}
                    </div>
                  )}
                  <div><strong>Duração:</strong> {profissionalInfo.duracao} minutos</div>
                </div>
              )}
              
              {profissionalInfo && (
                <div className="form-group">
                  <label>Horário Disponíveis</label>
                  {horariosDisponiveis.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                      {horariosDisponiveis.map(hora => (
                        <button
                          key={hora}
                          type="button"
                          onClick={() => {
                            const dataFormat = novoHorario.data_hora ? novoHorario.data_hora.split('T')[0] : '';
                            setNovoHorario({ ...novoHorario, data_hora: `${dataFormat}T${hora}:00` });
                          }}
                          style={{
                            padding: '0.6rem',
                            borderRadius: '8px',
                            border: novoHorario.data_hora?.endsWith(hora) ? '2px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)',
                            background: novoHorario.data_hora?.endsWith(hora) ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: novoHorario.data_hora?.endsWith(hora) ? '700' : '400'
                          }}
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px' }}>
                      Nenhum horário disponível para este dia
                    </div>
                  )}
                </div>
              )}
              
              {profissionalInfo && (
                <div className="form-group">
                  <label>Horário Selecionado</label>
                  <input 
                    type="time" 
                    value={novoHorario.data_hora ? novoHorario.data_hora.split('T')[1]?.substring(0, 5) || '' : ''} 
                    onChange={e => {
                      const dataFormat = novoHorario.data_hora ? novoHorario.data_hora.split('T')[0] : '';
                      setNovoHorario({ ...novoHorario, data_hora: `${dataFormat}T${e.target.value}:00` });
                    }}
                    required
                  />
                </div>
              )}
              
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
                  rows={2}
                  placeholder="Observações..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {
                  setShowModalNovoHorario(false);
                  setHorariosDisponiveis([]);
                  setProfissionalInfo(null);
                }}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting || !novoHorario.data_hora}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Hora de Início do Expediente</label>
                  <input 
                    type="time" 
                    value={novoProfissional.horario_inicio} 
                    onChange={e => setNovoProfissional({ ...novoProfissional, horario_inicio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora de Fim do Expediente</label>
                  <input 
                    type="time" 
                    value={novoProfissional.horario_fim} 
                    onChange={e => setNovoProfissional({ ...novoProfissional, horario_fim: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Início do Almoço</label>
                  <input 
                    type="time" 
                    value={novoProfissional.almoco_inicio} 
                    onChange={e => setNovoProfissional({ ...novoProfissional, almoco_inicio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Fim do Almoço</label>
                  <input 
                    type="time" 
                    value={novoProfissional.almoco_fim} 
                    onChange={e => setNovoProfissional({ ...novoProfissional, almoco_fim: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Duração do Atendimento (minutos)</label>
                  <select 
                    value={novoProfissional.duracao_atendimento} 
                    onChange={e => setNovoProfissional({ ...novoProfissional, duracao_atendimento: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={40}>40 minutos</option>
                    <option value={50}>50 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                    <option value={120}>120 minutos</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Atendimentos Simultâneos</label>
                  <input 
                    type="number" 
                    min="1"
                    value={novoProfissional.capacidade_atendimento} 
                    onChange={e => setNovoProfissional({ ...novoProfissional, capacidade_atendimento: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
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

      {showModalEditCliente && editingCliente && (
        <div className="modal-overlay" onClick={() => setShowModalEditCliente(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Editar Cliente</h2>
              <button className="modal-close" onClick={() => setShowModalEditCliente(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditarCliente}>
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  value={editingCliente.nome} 
                  onChange={e => setEditingCliente({ ...editingCliente, nome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Telefone / WhatsApp</label>
                <input 
                  type="tel" 
                  value={editingCliente.telefone} 
                  onChange={e => setEditingCliente({ ...editingCliente, telefone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input 
                  type="email" 
                  value={editingCliente.email || ''} 
                  onChange={e => setEditingCliente({ ...editingCliente, email: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalEditCliente(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : <><Pencil size={18} /> Salvar Alterações</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalEditProfissional && editingProfissional && (
        <div className="modal-overlay" onClick={() => setShowModalEditProfissional(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Editar Profissional</h2>
              <button className="modal-close" onClick={() => setShowModalEditProfissional(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditarProfissional}>
              <div className="form-group">
                <label>Nome</label>
                <input 
                  type="text" 
                  value={editingProfissional.nome} 
                  onChange={e => setEditingProfissional({ ...editingProfissional, nome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Área/Especialidade</label>
                <input 
                  type="text" 
                  value={editingProfissional.area || ''} 
                  onChange={e => setEditingProfissional({ ...editingProfissional, area: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Dias da Semana que Trabalha</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'].map(dia => {
                    const labels: { [key: string]: string } = { segunda: 'Segunda', terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta', sexta: 'Sexta', sabado: 'Sábado', domingo: 'Domingo' };
                    return (
                      <label key={dia} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input 
                          type="checkbox" 
                          checked={editingProfissional.diasTrabalho?.includes(dia) || false}
                          onChange={e => {
                            const dias = [...(editingProfissional.diasTrabalho || [])];
                            if (e.target.checked) {
                              if (!dias.includes(dia)) dias.push(dia);
                            } else {
                              const index = dias.indexOf(dia);
                              if (index > -1) dias.splice(index, 1);
                            }
                            setEditingProfissional({ ...editingProfissional, diasTrabalho: dias });
                          }}
                        />
                        {labels[dia]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Hora de Início</label>
                  <input 
                    type="time" 
                    value={editingProfissional.horario_inicio || ''} 
                    onChange={e => setEditingProfissional({ ...editingProfissional, horario_inicio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Hora de Fim</label>
                  <input 
                    type="time" 
                    value={editingProfissional.horario_fim || ''} 
                    onChange={e => setEditingProfissional({ ...editingProfissional, horario_fim: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Início do Almoço</label>
                  <input 
                    type="time" 
                    value={editingProfissional.almoco_inicio || ''} 
                    onChange={e => setEditingProfissional({ ...editingProfissional, almoco_inicio: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Fim do Almoço</label>
                  <input 
                    type="time" 
                    value={editingProfissional.almoco_fim || ''} 
                    onChange={e => setEditingProfissional({ ...editingProfissional, almoco_fim: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Duração do Atendimento (minutos)</label>
                  <select 
                    value={editingProfissional.duracao_atendimento || 50} 
                    onChange={e => setEditingProfissional({ ...editingProfissional, duracao_atendimento: parseInt(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                  >
                    <option value={30}>30 minutos</option>
                    <option value={40}>40 minutos</option>
                    <option value={50}>50 minutos</option>
                    <option value={60}>60 minutos</option>
                    <option value={90}>90 minutos</option>
                    <option value={120}>120 minutos</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Atendimentos Simultâneos</label>
                  <input 
                    type="number" 
                    min="1"
                    value={editingProfissional.capacidade_atendimento || 1} 
                    onChange={e => setEditingProfissional({ ...editingProfissional, capacidade_atendimento: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModalEditProfissional(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : <><Pencil size={18} /> Salvar Alterações</>}
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
