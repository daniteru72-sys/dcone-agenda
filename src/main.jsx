import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eraser,
  Save,
  Scissors,
  Sparkles,
  User,
  Wand2,
  XCircle
} from 'lucide-react';
import CustomerBooking from './src/CustomerBooking.jsx';
import OwnerReservations from './src/OwnerReservations.jsx';
import './styles.css';

const BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'DCONE BARBER';
const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';
const OWNER_CHAT_ID = import.meta.env.VITE_OWNER_CHAT_ID || '';

const DAYS = [
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
];

const TIMES = [
  '10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30',
  '16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00',
  '20:30','21:00'
];

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mondayOfNextWeek() {
  const today = new Date();
  today.setHours(12,0,0,0);
  const day = today.getDay() || 7;
  today.setDate(today.getDate() + (8 - day));
  return today;
}

function shiftDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatShort(date) {
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit' }).format(date);
}

function formatLong(date) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: '2-digit', month: 'long'
  }).format(date);
}

function App() {
  const [monday, setMonday] = useState(mondayOfNextWeek());
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: 'neutral', text: 'Marca los huecos que quieras abrir.' });

  const dates = useMemo(() => DAYS.map((_, i) => shiftDays(monday, i)), [monday]);
  const weekId = `${toISODate(dates[0])}_${toISODate(shiftDays(dates[0], 6))}`;
  const storageKey = `dcone-agenda:${weekId}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setSelected(new Set(saved));
    } catch {
      setSelected(new Set());
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...selected]));
  }, [selected, storageKey]);

  function toggleSlot(day, time) {
    const key = `${day}|${time}`;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleDay(day) {
    const keys = TIMES.map(time => `${day}|${time}`);
    const allSelected = keys.every(key => selected.has(key));
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(key => allSelected ? next.delete(key) : next.add(key));
      return next;
    });
  }

  function selectUsualHours() {
    const usual = ['16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'];
    const next = new Set();
    DAYS.forEach(([day]) => usual.forEach(time => next.add(`${day}|${time}`)));
    setSelected(next);
    setMessage({ type: 'neutral', text: 'Horario habitual cargado. Puedes modificarlo antes de guardar.' });
  }

  function changeWeek(direction) {
    setMonday(prev => shiftDays(prev, direction * 7));
    setMessage({ type: 'neutral', text: 'Semana cambiada. Marca los nuevos huecos.' });
  }

  async function submit() {
    if (!WEBHOOK_URL) {
      setMessage({ type: 'error', text: 'Falta configurar VITE_N8N_WEBHOOK_URL en EasyPanel.' });
      return;
    }
    if (!selected.size) {
      setMessage({ type: 'error', text: 'Selecciona al menos un hueco antes de guardar.' });
      return;
    }

    const slots = [...selected].map(item => {
      const [day, hora] = item.split('|');
      const index = DAYS.findIndex(([key]) => key === day);
      return {
        dia: day,
        fecha: toISODate(dates[index]),
        hora,
        estado: 'libre'
      };
    }).sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));

    const payload = {
      owner_chat_id: OWNER_CHAT_ID,
      semana_id: weekId,
      fecha_inicio: toISODate(dates[0]),
      fecha_fin: toISODate(shiftDays(dates[0], 6)),
      negocio: BUSINESS_NAME,
      slots
    };

    setSaving(true);
    setMessage({ type: 'neutral', text: 'Guardando los horarios en n8n…' });

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setMessage({
        type: 'success',
        text: `Agenda abierta correctamente: ${slots.length} huecos guardados.`
      });
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error(error);
      setMessage({
        type: 'error',
        text: 'No se pudo conectar con n8n. Revisa el webhook, CORS y que el workflow esté activo.'
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="brand">
          <div className="brand-mark">DB</div>
          <div>
            <p className="eyebrow">GESTIÓN SEMANAL</p>
            <h1>{BUSINESS_NAME}</h1>
            <p className="subtitle">Selecciona de forma rápida las horas disponibles.</p>
          </div>
        </div>
        <div className="week-badge">
          <CalendarDays size={18} />
          {formatShort(dates[0])} – {formatShort(dates[5])}
        </div>
      </section>

      <section className="toolbar card">
        <div className="week-navigation">
          <button className="icon-button" onClick={() => changeWeek(-1)} aria-label="Semana anterior">
            <ChevronLeft />
          </button>
          <div>
            <span className="label">Semana seleccionada</span>
            <strong>{formatLong(dates[0])}</strong>
          </div>
          <button className="icon-button" onClick={() => changeWeek(1)} aria-label="Semana siguiente">
            <ChevronRight />
          </button>
        </div>

        <div className="toolbar-actions">
          <button className="secondary-button" onClick={selectUsualHours}>
            <Wand2 size={17} /> Horario habitual
          </button>
          <button className="secondary-button danger" onClick={() => setSelected(new Set())}>
            <Eraser size={17} /> Limpiar
          </button>
        </div>
      </section>

      <section className="stats">
        <article className="stat-card">
          <Clock3 size={20} />
          <div><strong>{selected.size}</strong><span>huecos seleccionados</span></div>
        </article>
        <article className="stat-card">
          <Sparkles size={20} />
          <div><strong>30 min</strong><span>por cita</span></div>
        </article>
        <article className="stat-card">
          <CalendarDays size={20} />
          <div><strong>21:00</strong><span>última cita</span></div>
        </article>
      </section>

      <OwnerReservations />
      
      <section className="schedule card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="time-column">Hora</th>
                {DAYS.map(([day, label], index) => (
                  <th key={day}>
                    <div className="day-header">
                      <strong>{label}</strong>
                      <span>{formatShort(dates[index])}</span>
                      <button onClick={() => toggleDay(day)}>Marcar día</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMES.map(time => (
                <tr key={time}>
                  <td className="time-column">{time}</td>
                  {DAYS.map(([day]) => {
                    const active = selected.has(`${day}|${time}`);
                    return (
                      <td key={`${day}-${time}`}>
                        <button
                          className={`slot ${active ? 'active' : ''}`}
                          onClick={() => toggleSlot(day, time)}
                          aria-pressed={active}
                          aria-label={`${day} ${time}`}
                        >
                          {active ? <Check size={17} /> : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="save-panel card">
        <div className={`status-message ${message.type}`}>
          {message.type === 'error' ? <XCircle size={20} /> : <Save size={20} />}
          <div>
            <strong>{message.type === 'success' ? 'Todo listo' : 'Estado'}</strong>
            <span>{message.text}</span>
          </div>
        </div>
        <button className="primary-button" onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : 'Confirmar horarios'}
        </button>
      </section>
    </main>
  );
}


const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  path.startsWith('/reservar')
    ? <CustomerBooking />
    : <App />
);

