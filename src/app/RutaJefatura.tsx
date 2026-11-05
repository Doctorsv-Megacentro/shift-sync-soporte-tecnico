/**
 * Guardián de sesión para `/jefe/*`: sin sesión pide iniciar con Google, con
 * sesión pero sin acceso muestra «No tienes acceso», con acceso pinta el
 * layout de jefatura (menú lateral; barra superior bajo 700 px) y la ruta
 * pedida. ADR-0006, ADR-0015.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cerrarSesion, iniciarSesionConGoogle } from '@/data/auth.ts';
import { listarConflictos } from '@/domain/conflicts/index.ts';
import { obtenerDatosPanel, type DatosPanel } from '@/data/panel.ts';
import { useSesion } from './useSesion.ts';
import './jefatura.css';

const ITEMS_MENU = [
  { href: '/jefe/fuente', etiqueta: 'Fuente de datos', listo: true },
  { href: '/jefe/panel', etiqueta: 'Panel y conflictos', listo: true },
  { href: '/jefe/horario', etiqueta: 'Horario completo', listo: true },
  { href: '/jefe/compartir', etiqueta: 'Compartir', listo: true },
] as const;

export interface ContextoJefatura {
  readonly carga: 'idle' | 'cargando' | 'ok' | 'error';
  readonly datos: DatosPanel | null;
  readonly recargar: () => Promise<void>;
}

function Centrado({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--fondo)',
      }}
    >
      <div style={{ maxWidth: 360, textAlign: 'center', padding: '2rem' }}>{children}</div>
    </main>
  );
}

export function RutaJefatura() {
  const sesion = useSesion();
  const [datos, setDatos] = useState<DatosPanel | null>(null);
  const [carga, setCarga] = useState<ContextoJefatura['carga']>('idle');

  const recargar = useCallback(async () => {
    const siguientes = await obtenerDatosPanel();
    setDatos(siguientes);
    setCarga('ok');
  }, []);

  useEffect(() => {
    if (sesion.tipo !== 'jefatura') return;
    setCarga('cargando');
    void recargar().catch(() => setCarga('error'));
  }, [sesion.tipo, recargar]);

  const pendientes = useMemo(() => {
    if (datos === null) return null;
    return listarConflictos(datos.months, datos.overrides, datos.acks).pendientes.length;
  }, [datos]);

  if (sesion.tipo === 'cargando') {
    return <Centrado>Cargando…</Centrado>;
  }

  if (sesion.tipo === 'sin-sesion') {
    return (
      <Centrado>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>ShiftSync</h1>
        <p style={{ color: 'var(--texto-2)', marginBottom: 20 }}>
          Entra con tu cuenta de Google para administrar el horario.
        </p>
        <button
          type="button"
          onClick={() => void iniciarSesionConGoogle()}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radio-control)',
            border: 'none',
            background: 'var(--primario)',
            color: '#fff',
            cursor: 'pointer',
            minHeight: 'var(--tactil-min)',
          }}
        >
          Entrar con Google
        </button>
      </Centrado>
    );
  }

  if (sesion.tipo === 'sin-acceso') {
    return (
      <Centrado>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>No tienes acceso de jefatura</h1>
        <p style={{ color: 'var(--texto-2)', marginBottom: 20 }}>
          {sesion.email} no está en la lista de correos permitidos. Pide a jefatura que lo agregue.
        </p>
        <button
          type="button"
          onClick={() => void cerrarSesion()}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radio-control)',
            border: '1px solid var(--borde)',
            background: 'var(--superficie)',
            cursor: 'pointer',
            minHeight: 'var(--tactil-min)',
          }}
        >
          Cerrar sesión
        </button>
      </Centrado>
    );
  }

  return (
    <div className="ss-jefatura">
      <nav className="ss-jefatura-nav">
        <div className="marca">ShiftSync</div>
        <ul>
          {ITEMS_MENU.map((item) => (
            <li key={item.href}>
              {item.listo ? (
                <NavLink
                  to={item.href}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 'var(--radio-control)',
                    color: isActive ? 'var(--primario)' : 'var(--texto)',
                    background: isActive ? 'var(--primario-suave)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 14,
                  })}
                >
                  <span style={{ flex: 1 }}>{item.etiqueta}</span>
                  {item.href === '/jefe/panel' && pendientes !== null && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--peligro)',
                        background: 'var(--sev-alta-fondo)',
                        borderRadius: 999,
                        padding: '1px 8px',
                      }}
                    >
                      {pendientes}
                    </span>
                  )}
                </NavLink>
              ) : (
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: 14,
                    color: 'var(--apagado)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{item.etiqueta}</span>
                  <span style={{ fontSize: 11, textTransform: 'uppercase' }}>Próximamente</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="ss-jefatura-sesion">
          <div style={{ fontSize: 12, color: 'var(--texto-3)', wordBreak: 'break-all' }}>
            {sesion.email}
          </div>
          <button
            type="button"
            onClick={() => void cerrarSesion()}
            style={{
              fontSize: 13,
              border: 'none',
              background: 'transparent',
              color: 'var(--texto-3)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </nav>
      <div className="ss-jefatura-cuerpo">
        <Outlet context={{ carga, datos, recargar } satisfies ContextoJefatura} />
      </div>
    </div>
  );
}
