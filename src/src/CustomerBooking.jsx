import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Scissors,
  User
} from 'lucide-react';

const AVAILABILITY_URL =
  import.meta.env.VITE_AVAILABILITY_URL ||
  'https://n8n.min8n.tech/webhook/huecos-disponibles';

const BOOKING_URL =
  import.meta.env.VITE_BOOKING_URL ||
  'https://n8n.min8n.tech/webhook/crear-reserva';

function formatDate(fecha) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${fecha}T12:00:00`));
}

export default function CustomerBooking() {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(null);
  const [service, setService] = useState('');
  const [slot, setSlot] = useState(null);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    cargarHuecos();
  }, []);

  async function cargarHuecos() {
    setLoading(true);
    setStatus('');

    try {
      const response = await fetch(
        `${AVAILABILITY_URL}?business_id=dcone-barber`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAvailability(data);

      if (data.servicios?.length) {
        setService(data.servicios[0].id);
      }
    } catch (error) {
      console.error(error);
      setStatus('No se pudieron cargar los horarios disponibles.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmarReserva() {
    if (!service) {
      setStatus('Selecciona un servicio.');
      return;
    }

    if (!slot) {
      setStatus('Selecciona una fecha y una hora.');
      return;
    }

    if (!nombre.trim()) {
      setStatus('Introduce tu nombre.');
      return;
    }

    const servicioSeleccionado =
      availability.servicios.find(item => item.id === service);

    const payload = {
      chat_id: telefono || `WEB-${Date.now()}`,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      servicio: servicioSeleccionado?.nombre || service,
      fecha: slot.fecha,
      hora: slot.hora,
      hueco_id: slot.hueco_id,
      business_id: 'dcone-barber',
      canal: 'web'
    };

    setSending(true);
    setStatus('Confirmando la reserva…');

    try {
      const response = await fetch(BOOKING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || result.ok === false) {
        throw new Error(result.mensaje || 'No se pudo reservar');
      }

      setStatus(
        `✅ Cita confirmada el ${formatDate(slot.fecha)} a las ${slot.hora}.`
      );

      await cargarHuecos();
      setSlot(null);
    } catch (error) {
      console.error(error);
      setStatus(
        error.message ||
        'Ese hueco ya no está disponible. Selecciona otro.'
      );

      await cargarHuecos();
      setSlot(null);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="customer-page">
        <div className="booking-card">
          <h1>Cargando disponibilidad…</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="customer-page">
      <section className="customer-hero">
        <div className="brand-mark">DB</div>

        <div>
          <p className="eyebrow">RESERVA ONLINE</p>
          <h1>{availability?.negocio || 'DCONE BARBER'}</h1>
          <p className="subtitle">
            Elige el servicio, la fecha y la hora que prefieras.
          </p>
        </div>
      </section>

      <section className="booking-card">
        <div className="booking-step">
          <span className="step-number">1</span>
          <div>
            <h2>Elige un servicio</h2>
            <p>Selecciona lo que necesitas.</p>
          </div>
        </div>

        <div className="service-grid">
          {availability?.servicios?.map(item => (
            <button
              key={item.id}
              className={`service-option ${
                service === item.id ? 'active' : ''
              }`}
              onClick={() => setService(item.id)}
            >
              <Scissors size={21} />
              <strong>{item.nombre}</strong>
              <span>{item.duracion} minutos</span>
            </button>
          ))}
        </div>
      </section>

      <section className="booking-card">
        <div className="booking-step">
          <span className="step-number">2</span>
          <div>
            <h2>Elige fecha y hora</h2>
            <p>Solo se muestran las horas que están libres.</p>
          </div>
        </div>

        {!availability?.huecos?.length ? (
          <div className="empty-state">
            No hay horas disponibles actualmente.
          </div>
        ) : (
          <div className="customer-days">
            {Object.entries(availability.dias || {}).map(
              ([fecha, horas]) => (
                <article className="customer-day" key={fecha}>
                  <header>
                    <CalendarDays size={19} />
                    <strong>{formatDate(fecha)}</strong>
                  </header>

                  <div className="customer-slots">
                    {horas.map(item => {
                      const active =
                        slot?.hueco_id === item.hueco_id;

                      return (
                        <button
                          key={item.hueco_id}
                          className={`customer-slot ${
                            active ? 'active' : ''
                          }`}
                          onClick={() =>
                            setSlot({
                              ...item,
                              fecha
                            })
                          }
                        >
                          <Clock3 size={16} />
                          {item.hora}
                          {active && <Check size={16} />}
                        </button>
                      );
                    })}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      <section className="booking-card">
        <div className="booking-step">
          <span className="step-number">3</span>
          <div>
            <h2>Confirma tus datos</h2>
            <p>El teléfono es opcional.</p>
          </div>
        </div>

        <div className="customer-form">
          <label>
            Nombre
            <input
              value={nombre}
              onChange={event => setNombre(event.target.value)}
              placeholder="Tu nombre"
            />
          </label>

          <label>
            Teléfono
            <input
              value={telefono}
              onChange={event => setTelefono(event.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>

        {slot && (
          <div className="booking-summary">
            <strong>Tu cita</strong>
            <span>{formatDate(slot.fecha)}</span>
            <span>{slot.hora}</span>
          </div>
        )}

        {status && <div className="customer-status">{status}</div>}

        <button
          className="primary-button customer-confirm"
          onClick={confirmarReserva}
          disabled={sending}
        >
          {sending ? 'Confirmando…' : 'Confirmar cita'}
        </button>
      </section>
    </main>
  );
}
