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

import OneSignal from 'react-onesignal';

const AVAILABILITY_URL =
  import.meta.env.VITE_AVAILABILITY_URL ||
  'https://n8n.min8n.tech/webhook/huecos-disponibles';

const BOOKING_URL =
  import.meta.env.VITE_BOOKING_URL ||
  'https://n8n.min8n.tech/webhook/crear-reserva';

const SUGGESTION_URL =
  import.meta.env.VITE_SUGGESTION_URL ||
  'https://n8n.min8n.tech/webhook/sugerir-cita';

const [pushDisponible, setPushDisponible] = useState(false);
const [pushActivo, setPushActivo] = useState(false);

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
  const [mostrarSugerencia, setMostrarSugerencia] = useState(false);

const [sugerencia, setSugerencia] = useState({
  fecha_sugerida: '',
  hora_sugerida: '',
  observaciones: ''
});

const [enviandoSugerencia, setEnviandoSugerencia] = useState(false);
const [mensajeSugerencia, setMensajeSugerencia] = useState('');
const [errorSugerencia, setErrorSugerencia] = useState('');

  useEffect(() => {
    cargarHuecos();
  }, []);
useEffect(() => {
  let activo = true;

  async function iniciarPush() {
    try {
      await OneSignal.init({
        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerParam: {
          scope: '/'
        },
        notifyButton: {
          enable: false
        },
        allowLocalhostAsSecureOrigin: false
      });

      if (!activo) return;

      setPushDisponible(true);

      const aceptado =
        OneSignal.Notifications.permission === true;

      setPushActivo(aceptado);
    } catch (error) {
      console.error('Error iniciando OneSignal:', error);
    }
  }

  iniciarPush();

  return () => {
    activo = false;
  };
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

      const [reservaConfirmada, setReservaConfirmada] = useState(false);
      setReservaConfirmada(true);

  
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

  async function enviarSugerencia(event) {
  event.preventDefault();

  setErrorSugerencia('');
  setMensajeSugerencia('');

  if (!sugerencia.fecha_sugerida) {
    setErrorSugerencia('Selecciona un día preferido.');
    return;
  }

  if (!sugerencia.hora_sugerida) {
    setErrorSugerencia('Selecciona una hora aproximada.');
    return;
  }

  if (!nombre?.trim()) {
    setErrorSugerencia(
      'Escribe tu nombre en el formulario principal antes de enviar la propuesta.'
    );
    return;
  }

  if (!service) {
    setErrorSugerencia(
      'Selecciona primero el servicio que necesitas.'
    );
    return;
  }

  setEnviandoSugerencia(true);

  try {
    const response = await fetch(SUGGESTION_URL, {
      method: 'POST',
      headers: {
  'Content-Type': 'text/plain;charset=UTF-8',
  Accept: 'application/json'
},
      body: JSON.stringify({
        business_id: 'dcone-barber',
        nombre: nombre.trim(),
        telefono: telefono?.trim() || '',
        servicio: service,
        fecha_sugerida: sugerencia.fecha_sugerida,
        hora_sugerida: sugerencia.hora_sugerida,
        observaciones: sugerencia.observaciones.trim()
      })
    });

    let resultado = {};

    try {
      resultado = await response.json();
    } catch {
      resultado = {};
    }

    if (!response.ok || resultado.ok === false) {
      throw new Error(
        resultado.mensaje ||
        'No se pudo enviar la propuesta.'
      );
    }

    setMensajeSugerencia(
      resultado.mensaje ||
      'Tu propuesta se ha enviado al establecimiento.'
    );

    setSugerencia({
      fecha_sugerida: '',
      hora_sugerida: '',
      observaciones: ''
    });
  } catch (error) {
    console.error(error);

    setErrorSugerencia(
      error.message ||
      'Ha ocurrido un problema al enviar la propuesta.'
    );
  } finally {
    setEnviandoSugerencia(false);
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

        <div className="customer-suggestion">
  <p>¿Ninguna hora te viene bien?</p>

  <button
    type="button"
    className="secondary-button"
    onClick={() => {
      setMensajeSugerencia('');
      setErrorSugerencia('');
      setMostrarSugerencia(true);
    }}
  >
    Sugerir otra fecha y hora
  </button>
</div>
        
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

      {reservaConfirmada && (
  <button
    className="primary-button"
    onClick={async () => {
      await OneSignal.Notifications.requestPermission();
    }}
  >
    🔔 Activar notificaciones
  </button>
)}
      
      {mostrarSugerencia && (
  <div
    className="suggestion-modal-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setMostrarSugerencia(false);
      }
    }}
  >
    <section
      className="suggestion-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestion-modal-title"
    >
      <div className="suggestion-modal-header">
        <div>
          <p className="eyebrow">PROPUESTA DE CITA</p>

          <h2 id="suggestion-modal-title">
            Sugiere otro horario
          </h2>

          <p>
            Indica cuándo te vendría mejor. El establecimiento
            revisará tu propuesta antes de confirmarla.
          </p>
        </div>

        <button
          type="button"
          className="suggestion-close"
          aria-label="Cerrar"
          onClick={() => setMostrarSugerencia(false)}
        >
          ×
        </button>
      </div>

      <form
        className="suggestion-form"
        onSubmit={enviarSugerencia}
      >
        <label>
          <span>Día preferido</span>

          <div className="suggestion-native-input">
            <input
              type="date"
              value={sugerencia.fecha_sugerida}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => {
                setSugerencia((actual) => ({
                  ...actual,
                  fecha_sugerida: event.target.value
                }));
              }}
              required
            />
          </div>
        </label>

        <label>
          <span>Hora aproximada</span>

          <div className="suggestion-native-input">
            <input
              type="time"
              value={sugerencia.hora_sugerida}
              onChange={(event) => {
                setSugerencia((actual) => ({
                  ...actual,
                  hora_sugerida: event.target.value
                }));
              }}
              required
            />
          </div>
        </label>

        <label className="suggestion-full-field">
          <span>Comentario opcional</span>

          <textarea
            rows="4"
            maxLength="500"
            placeholder="Por ejemplo: también podría media hora más tarde."
            value={sugerencia.observaciones}
            onChange={(event) => {
              setSugerencia((actual) => ({
                ...actual,
                observaciones: event.target.value
              }));
            }}
          />

          <small>
            {sugerencia.observaciones.length}/500
          </small>
        </label>

        {errorSugerencia && (
          <div
            className="suggestion-feedback suggestion-error"
            role="alert"
          >
            {errorSugerencia}
          </div>
        )}

        {mensajeSugerencia && (
          <div
            className="suggestion-feedback suggestion-success"
            role="status"
          >
            ✅ {mensajeSugerencia}
          </div>
        )}

        <div className="suggestion-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setMostrarSugerencia(false)}
          >
            {mensajeSugerencia ? 'Cerrar' : 'Cancelar'}
          </button>

          {!mensajeSugerencia && (
            <button
              type="submit"
              className="primary-button"
              disabled={enviandoSugerencia}
            >
              {enviandoSugerencia
                ? 'Enviando…'
                : 'Enviar propuesta'}
            </button>
          )}
        </div>
      </form>
    </section>
  </div>
)}
      
    </main>
  );
}
