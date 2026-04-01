import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
// @ts-ignore
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarComponent.css';
import { Trash2, X, Check, Search } from 'lucide-react';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const API_URL = import.meta.env.VITE_API_URL || 'http://jsceqezyy86wb3mz6pojr7kr.72.60.11.33.sslip.io/api';

interface Cliente {
  id: number;
  nome: string;
  telefone: string;
}

interface Profissional {
  id: number;
  nome: string;
  especialidade: string;
}
>>>>>>> d958e52 (fix(layout): full responsiveness, fix API_URL for prod)

interface Agendamento {
  id: number;
  cliente_id: number;
  profissional_id: number;
  cliente_nome: string;
  cliente_telefone: string;
  data_hora: string;
  status: string;
  observacoes?: string;
  profissional_nome?: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Agendamento;
}

interface CalendarProps {
  clinicaId: string;
}

const CalendarComponent: React.FC<CalendarProps> = ({ clinicaId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<any>(Views.MONTH);
  
  // Form State
  const [formData, setFormData] = useState({
    cliente_id: '',
    profissional_id: '',
    data: '',
    hora: '',
    status: 'pendente',
    observacoes: ''
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [searchCliente, setSearchCliente] = useState('');

  const fetchAgendamentos = async () => {
    try {
      const response = await fetch(`${API_URL}/agendamentos`, {
        headers: { 'X-Clinica-ID': clinicaId }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const mapped = data.map((a: any) => ({
          id: a.id,
          title: `${a.cliente_nome || 'Cliente'} (${a.status})`,
          start: new Date(a.data_hora),
          end: new Date(new Date(a.data_hora).getTime() + 60 * 60 * 1000), // +1 hora
          resource: a
        }));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      setEvents([]);
    }
  };

  const fetchAuxiliar = async () => {
    try {
      const [resC, resP] = await Promise.all([
        fetch(`${API_URL}/clientes`, { headers: { 'X-Clinica-ID': clinicaId } }),
        fetch(`${API_URL}/profissionais`, { headers: { 'X-Clinica-ID': clinicaId } })
      ]);
      const cJson = await resC.json();
      const pJson = await resP.json();
      setClientes(Array.isArray(cJson) ? cJson : []);
      setProfissionais(Array.isArray(pJson) ? pJson : []);
    } catch (error) {
      console.error('Erro ao buscar dados auxiliares:', error);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
    fetchAuxiliar();
  }, [clinicaId]);

  const handleSelectSlot = (slotInfo: { start: Date }) => {
    setIsNew(true);
    setSelectedEvent(null);
    setFormData({
      cliente_id: '',
      profissional_id: '',
      data: moment(slotInfo.start).format('YYYY-MM-DD'),
      hora: moment(slotInfo.start).format('HH:mm'),
      status: 'pendente',
      observacoes: ''
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setIsNew(false);
    setSelectedEvent(event);
    setFormData({
      cliente_id: event.resource.cliente_id.toString(),
      profissional_id: event.resource.profissional_id ? event.resource.profissional_id.toString() : '',
      data: moment(event.start).format('YYYY-MM-DD'),
      hora: moment(event.start).format('HH:mm'),
      status: event.resource.status,
      observacoes: event.resource.observacoes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.profissional_id) {
       alert('Selecione o Cliente e o Profissional.');
       return;
    }

    const dataHoraStr = `${formData.data} ${formData.hora}`;
    const mDate = moment(dataHoraStr, 'YYYY-MM-DD HH:mm');
    if (!mDate.isValid()) {
      alert('Data ou Hora inválida');
      return;
    }
    const payload = {
      cliente_id: parseInt(formData.cliente_id),
      profissional_id: parseInt(formData.profissional_id),
      data_hora: mDate.toISOString(),
      status: formData.status,
      observacoes: formData.observacoes
    };

    try {
      let response;
      if (isNew) {
        response = await fetch(`${API_URL}/agendamentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': clinicaId },
          body: JSON.stringify(payload)
        });
      } else if (selectedEvent) {
        response = await fetch(`${API_URL}/agendamentos/${selectedEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Clinica-ID': clinicaId },
          body: JSON.stringify(payload)
        });
      }

      if (response && response.ok) {
        setIsModalOpen(false);
        fetchAgendamentos();
        alert('Agendamento salvo com sucesso!');
      } else {
        const errorData = await (response ? response.json() : Promise.resolve({error: 'Falha desconhecida.'}));
        alert(`Erro ao salvar: ${errorData.error || 'Verifique seus dados.'}`);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !window.confirm('Deseja realmente excluir este agendamento?')) return;
    try {
      const response = await fetch(`${API_URL}/agendamentos/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { 'X-Clinica-ID': clinicaId }
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchAgendamentos();
      } else {
        alert('Erro ao excluir agendamento');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchCliente.toLowerCase()) || 
    c.telefone.includes(searchCliente)
  );

  return (
    <div className="calendar-wrapper glass-card">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={currentDate}
        view={currentView}
        onNavigate={setCurrentDate}
        onView={setCurrentView}
        views={['month', 'week', 'day']}
        selectable
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        messages={{
<<<<<<< HEAD
          next: "PrÃ³ximo",
          previous: "Anterior",
          today: "Hoje",
          month: "MÃªs",
=======
          next: ">",
          previous: "<",
          month: "Mês",
>>>>>>> d958e52 (fix(layout): full responsiveness, fix API_URL for prod)
          week: "Semana",
          day: "Dia"
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.resource.status === 'confirmado' ?  '#4ade80' : 
                            event.resource.status === 'cancelado' ? '#ef4444' : '#facc15',
            borderRadius: '8px',
            color: '#000',
            border: 'none',
            fontSize: '0.85rem',
            padding: '2px 5px',
            fontWeight: '600'
          }
        })}
        style={{ height: '700px', color: '#fff' }}
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-scale-in">
            <div className="modal-header">
              <h3>{isNew ? 'Novo Agendamento' : 'Editar Agendamento'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="close-btn"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Cliente</label>
                <div className="client-search">
                  <Search size={16} className="search-icon"/>
                  <input 
                    type="text" 
                    placeholder="Filtrar cliente..." 
                    value={searchCliente}
                    onChange={(e) => setSearchCliente(e.target.value)}
                  />
                </div>
                <select 
                   required 
                   value={formData.cliente_id} 
                   onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                >
                  <option value="">Selecione um cliente...</option>
                  {filteredClientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.telefone})</option>
                  ))}
                </select>
                {filteredClientes.length === 0 && <p className="hint">Nenhum cliente encontrado.</p>}
              </div>

              <div className="form-group">
                <label>Profissional</label>
                <select 
                  required
                  value={formData.profissional_id} 
                  onChange={(e) => setFormData({...formData, profissional_id: e.target.value})}
                >
                  <option value="">Selecione um profissional...</option>
                  {profissionais.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} - {p.especialidade}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>Data</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.data}
                    onChange={(e) => setFormData({...formData, data: e.target.value})}
                  />
                </div>
                <div className="form-group half">
                  <label>Hora</label>
                  <input 
                    type="time" 
                    required 
                    value={formData.hora}
                    onChange={(e) => setFormData({...formData, hora: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="status-grid">
                  <button type="button" className={`status-btn pendente ${formData.status === 'pendente' ? 'active' : ''}`} onClick={() => setFormData({...formData, status: 'pendente'})}>Pendente</button>
                  <button type="button" className={`status-btn confirmado ${formData.status === 'confirmado' ? 'active' : ''}`} onClick={() => setFormData({...formData, status: 'confirmado'})}>Confirmado</button>
                  <button type="button" className={`status-btn cancelado ${formData.status === 'cancelado' ? 'active' : ''}`} onClick={() => setFormData({...formData, status: 'cancelado'})}>Cancelado</button>
                </div>
              </div>

              <div className="form-group">
                <label>Observações</label>
                <textarea 
                  rows={3} 
                  value={formData.observacoes} 
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  placeholder="Detalhes adicionais..."
                />
              </div>

              <div className="modal-actions">
                {!isNew && (
                  <button type="button" className="delete-btn" onClick={handleDelete}>
                    <Trash2 size={18}/> Excluir
                  </button>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                  <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                  <button type="submit" className="save-btn"><Check size={18}/> Salvar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;

