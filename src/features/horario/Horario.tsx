/**
 * Punto de entrada de `/jefe/horario`: pide el horario completo y resuelve
 * cargando/error antes de pintar la pantalla. Plan §7.4. Ficha:
 * docs/features/horario.md.
 */

import { useEffect, useState } from 'react';
import { obtenerHorarioCompleto, type HorarioCompleto } from '@/data/horario.ts';
import './horario.css';
import { VistaHorario } from './VistaHorario.tsx';

type Estado = { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'ok'; horario: HorarioCompleto };

function Esqueleto() {
  return (
    <div style={{ maxWidth: 1240 }}>
      <div className="ss-skeleton-horario" style={{ height: 32, width: 280, marginBottom: 24 }} />
      <div className="ss-skeleton-horario" style={{ height: 140, marginBottom: 16 }} />
      <div className="ss-skeleton-horario" style={{ height: 320 }} />
    </div>
  );
}

export function Horario() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    let vigente = true;
    setEstado({ tipo: 'cargando' });
    obtenerHorarioCompleto()
      .then((horario) => {
        if (vigente) setEstado({ tipo: 'ok', horario });
      })
      .catch(() => {
        if (vigente) setEstado({ tipo: 'error' });
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (estado.tipo === 'cargando') return <Esqueleto />;
  if (estado.tipo === 'error') {
    return <p style={{ color: 'var(--texto-2)' }}>No se pudo cargar el horario. Vuelve a intentarlo.</p>;
  }
  return <VistaHorario horario={estado.horario} />;
}
