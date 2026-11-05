/**
 * Punto de entrada de `/s/:slug`: pide la vista compartida y resuelve sus
 * estados (cargando, enlace inactivo, alcance no disponible, listo). Plan
 * §7.1. Ficha: docs/features/empleado.md.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { obtenerVistaCompartida, type VistaCompartida } from '@/data/sharedView.ts';
import './empleado.css';
import { VistaPersona } from './VistaPersona.tsx';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'inactivo' }
  | { tipo: 'error' }
  | { tipo: 'ok'; vista: VistaCompartida };

function Mensaje({ children }: { children: string }) {
  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <p style={{ color: 'var(--texto-2)', lineHeight: 1.6 }}>{children}</p>
    </main>
  );
}

function Esqueleto() {
  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '1.5rem' }}>
      <div className="ss-skeleton" style={{ height: 32, width: 280, marginBottom: 24 }} />
      <div className="ss-skeleton" style={{ height: 160, marginBottom: 16 }} />
      <div className="ss-skeleton" style={{ height: 220 }} />
    </main>
  );
}

export function Empleado() {
  const { slug } = useParams<{ slug: string }>();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    let vigente = true;
    if (slug === undefined) {
      setEstado({ tipo: 'inactivo' });
      return;
    }

    setEstado({ tipo: 'cargando' });
    obtenerVistaCompartida(slug)
      .then((resultado) => {
        if (!vigente) return;
        if (resultado.tipo === 'ok') setEstado({ tipo: 'ok', vista: resultado.vista });
        else setEstado(resultado);
      })
      .catch(() => {
        if (vigente) setEstado({ tipo: 'error' });
      });

    return () => {
      vigente = false;
    };
  }, [slug]);

  if (estado.tipo === 'cargando') return <Esqueleto />;
  if (estado.tipo === 'inactivo') {
    return <Mensaje>Este enlace ya no está activo. Pide uno nuevo a jefatura.</Mensaje>;
  }
  if (estado.tipo === 'error') {
    return <Mensaje>No se pudo cargar el horario. Vuelve a intentarlo.</Mensaje>;
  }

  return <VistaPersona slug={slug ?? ''} vista={estado.vista} />;
}
