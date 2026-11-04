/**
 * Guardián de sesión para `/jefe/*`: sin sesión pide iniciar con Google, con
 * sesión pero sin acceso muestra «No tienes acceso», con acceso pinta el
 * layout de jefatura (menú lateral) y la ruta pedida. ADR-0006, ADR-0015.
 */

import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { cerrarSesion, iniciarSesionConGoogle } from '@/data/auth.ts';
import { useSesion } from './useSesion.ts';

const ITEMS_MENU = [
  { href: '/jefe/fuente', etiqueta: 'Fuente de datos', listo: true },
  { href: '/jefe/panel', etiqueta: 'Panel y conflictos', listo: false },
  { href: '/jefe/horario', etiqueta: 'Horario completo', listo: false },
  { href: '/jefe/compartir', etiqueta: 'Compartir', listo: false },
] as const;

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav
        style={{
          width: 220,
          flexShrink: 0,
          borderRight: '1px solid var(--borde-suave)',
          padding: '1.5rem 1rem',
          background: 'var(--superficie)',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 24 }}>ShiftSync</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {ITEMS_MENU.map((item) => (
            <li key={item.href} style={{ marginBottom: 4 }}>
              {item.listo ? (
                <NavLink
                  to={item.href}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '8px 10px',
                    borderRadius: 'var(--radio-control)',
                    color: isActive ? 'var(--primario)' : 'var(--texto)',
                    background: isActive ? 'var(--primario-suave)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 14,
                  })}
                >
                  {item.etiqueta}
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
        <div style={{ marginTop: 32, borderTop: '1px solid var(--borde-suave)', paddingTop: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 8, wordBreak: 'break-all' }}>
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
      <div style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        <Outlet />
      </div>
    </div>
  );
}
