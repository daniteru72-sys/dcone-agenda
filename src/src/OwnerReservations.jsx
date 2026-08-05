import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Scissors,
  User,
  UserX
} from 'lucide-react';

const RESERVATIONS_URL =
  'https://n8n.min8n.tech/webhook/reservas-dia';

function fechaLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatearFecha(fecha) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${fecha}T12:00:00`));
}

function etiquetaEstado(estado) {
  const estados = {
    pendiente: 'Pendiente',
    confirmada: 'Confirmada',
    reprogramada: 'Reprogramada',
    completada: 'Completada',
    no_show: 'No presentado'
  };

  return estados[estado] || estado;
}

export default function OwnerReservations() {
  const [fecha, setFecha] = useState(() => fechaLocalISO(new Date()));
  const [datos, setDatos] = useState({
    reservas: [],
    resumen: {
      total: 0,
      pendientes: 0,
      confirmadas: 0,
      reprogramadas: 0,
      completadas: 0,
      no_show: 0,
      facturacion_estimada: 0
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const urlConsulta = useMemo(() => {
    const params = new URLSearchParams({
      fecha,
      business_id: 'dcone-barber'
    });

    return `${RESERVATIONS_URL}?${params.toString()}`;
  }, [fecha]);

  async function cargarReservas(silencioso = false) {
    if (!silencioso) {
      setLoading(true);
    }

    setError('');

    try {
      const response = await fetch(urlConsulta, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const resultado = await response.json();

      if (!resultado.ok) {
        throw new Error(
          resultado.mensaje || 'No se pudieron obtener las reservas'
        );
      }

      setDatos({
        reservas: Array.isArray(resultado.reservas)
          ? resultado.reservas
          : [],
        resumen: resultado.resumen || {}
      });
    } catch (err) {
      console.error(err);
      setError(
        'No se pudieron cargar las reservas. Revisa el workflow y CORS.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarReservas();

    const interval = window.setInterval(() => {
      cargarReservas(true);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [urlConsulta]);

  return (
    <section className="owner-reservations card">
      <header className="reservations-header">
        <div>
          <p className="eyebrow">AGENDA DEL DÍA</p>
          <h2>Reservas</h2>
          <p className="reservations-date">
            {formatearFecha(fecha)}
          </p>
        </div>

        <div className="reservations-controls">
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
          />

          <button
            className="secondary-button"
            onClick={() => cargarReservas()}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? 'rotating' : ''}
            />
            Actualizar
          </button>
        </div>
      </header>

      <div className="reservations-summary">
        <article>
          <CalendarDays size={19} />
          <strong>{datos.resumen.total || 0}</strong>
          <span>Total</span>
        </article>

        <article>
          <Clock3 size={19} />
          <strong>{datos.resumen.confirmadas || 0}</strong>
          <span>Confirmadas</span>
        </article>

        <article>
          <CheckCircle2 size={19} />
          <strong>{datos.resumen.completadas || 0}</strong>
          <span>Completadas</span>
        </article>

        <article>
          <UserX size={19} />
          <strong>{datos.resumen.no_show || 0}</strong>
          <span>No-show</span>
        </article>
      </div>

      {error && (
        <div className="reservations-error">
          {error}
        </div>
      )}

      {loading && !datos.reservas.length ? (
        <div className="reservations-empty">
          Cargando reservas…
        </div>
      ) : datos.reservas.length === 0 ? (
        <div className="reservations-empty">
          <CalendarDays size={28} />

          <strong>No hay reservas para este día</strong>

          <span>
            Las nuevas citas aparecerán aquí automáticamente.
          </span>
        </div>
      ) : (
        <div className="reservations-list">
          {datos.reservas.map((reserva) => (
            <article
              className="reservation-item"
              key={reserva.reserva_id}
            >
              <div className="reservation-hour">
                <Clock3 size={17} />
                <strong>{reserva.hora}</strong>
              </div>

              <div className="reservation-client">
                <strong>
                  <User size={16} />
                  {reserva.nombre || 'Cliente'}
                </strong>

                <span>
                  <Scissors size={15} />
                  {reserva.servicio}
                </span>
              </div>

              <span
                className={`reservation-status status-${reserva.estado}`}
              >
                {etiquetaEstado(reserva.estado)}
              </span>

              {reserva.telefono && (
                <a
                  className="reservation-phone"
                  href={`tel:${reserva.telefono}`}
                >
                  {reserva.telefono}
                </a>
              )}
            </article>
          ))}
        </div>
      )}

      <footer className="reservations-footer">
        Actualización automática cada 30 segundos
      </footer>
    </section>
  );
}
