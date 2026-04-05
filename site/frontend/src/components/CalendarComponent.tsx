import React, { useEffect, useState } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
// @ts-ignore
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarComponent.css';

moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const API_URL = 'http://jsceqezyy86wb3mz6pojr7kr.72.60.11.33.sslip.io/api';

interface Agendamento {
  id: number;
  cliente_nome: string;
  data_hora: string;
  status: string;
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
          end: new Date(new Date(a.data_hora).getTime() + 60 * 60 * 1000),
          resource: a
        }));
        setEvents(mapped);
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos para o calendÃ¡rio:', error);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, [clinicaId]);

  return (
    <div className="calendar-wrapper glass-card">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView={Views.MONTH}
        views={['month', 'week', 'day']}
        messages={{
          next: "PrÃ³ximo",
          previous: "Anterior",
          today: "Hoje",
          month: "MÃªs",
          week: "Semana",
          day: "Dia"
        }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor: event.resource.status === 'confirmado' ?  '#4ade80' : 
                            event.resource.status === 'cancelado' ? '#ef4444' : '#facc15',
            borderRadius: '10px',
            color: '#000',
            border: 'none',
            fontSize: '0.85rem',
            padding: '4px 8px',
            fontWeight: '700'
          }
        })}
        style={{ height: '700px', color: '#fff' }}
      />
    </div>
  );
};

export default CalendarComponent;
