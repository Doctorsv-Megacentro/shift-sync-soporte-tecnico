/**
 * El registro de cambios: lista de todos los cambios de jefatura vigentes,
 * con «Deshacer». Plan §7.5, captura 14. Ficha: docs/features/horario.md.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { deshacerCambioDia } from '@/data/horario.ts';
import type { DayOverride } from '@/domain/overlay.ts';
import { diaDe, type IndiceMes } from '@/domain/presence.ts';
import { formatFechaCorta } from '@/domain/time.ts';
import type { ShiftValue } from '@/domain/types.ts';

function textoValor(shift: ShiftValue | undefined): string {
  if (shift === undefined || shift.kind === 'unknown') return 'Sin datos';
  if (shift.kind === 'off') return 'Libre';
  if (shift.kind === 'vacation') return 'Vacaciones';
  return `${String(Math.floor(shift.startMin / 60)).padStart(2, '0')}:${String(shift.startMin % 60).padStart(2, '0')}-${String(Math.floor((shift.endMin % 1440) / 60)).padStart(2, '0')}:${String(shift.endMin % 60).padStart(2, '0')}`;
}

function fechaYHora(iso: string): string {
  const d = new Date(iso);
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${formatFechaCorta(dia)} · ${hora}`;
}

export function RegistroCambios({
  overrides,
  indice,
  indiceOriginal,
  onDeshecho,
  onCerrar,
}: {
  overrides: readonly DayOverride[];
  indice: IndiceMes;
  indiceOriginal: IndiceMes;
  onDeshecho: () => void;
  onCerrar: () => void;
}) {
  const [procesando, setProcesando] = useState<string | null>(null);
  const ordenados = [...overrides].sort((a, b) => a.date.localeCompare(b.date));

  async function deshacer(o: DayOverride) {
    setProcesando(`${o.personKey}|${o.date}`);
    try {
      await deshacerCambioDia(o.personKey, o.date);
      onDeshecho();
    } finally {
      setProcesando(null);
    }
  }

  return (
    <>
      <div aria-hidden style={estiloFondo} onClick={onCerrar} />
      <aside role="dialog" aria-modal="true" aria-label="Cambios de jefatura" style={estiloPanel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <p style={{ margin: 0, fontFamily: 'var(--fuente-titulo)', fontSize: 20, fontWeight: 700 }}>Cambios de jefatura · {overrides.length}</p>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} style={estiloBotonIcono}>
            ×
          </button>
        </div>

        {ordenados.length === 0 ? (
          <p style={{ margin: '18px 0', color: 'var(--texto-3)', fontSize: 14 }}>
            Todavía no hay cambios. Toca una celda del horario para cambiar un día.
          </p>
        ) : (
          <div>
            {ordenados.map((o) => {
              const persona = indice.personas.get(o.personKey);
              const apoyo = o.supportPersonKey !== null ? indice.personas.get(o.supportPersonKey) : null;
              const antes = diaDe(indiceOriginal, o.personKey, o.date)?.shift;
              const ahora = diaDe(indice, o.personKey, o.date)?.shift;
              const detalle = [o.reason, apoyo !== null ? apoyo !== undefined ? `apoyo con ${apoyo.displayName}` : null : null, o.note].filter(
                (x): x is string => x !== null && x !== undefined && x !== '',
              );
              const clave = `${o.personKey}|${o.date}`;
              return (
                <div key={clave} style={estiloFila}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {persona?.displayName ?? o.personKey} · {formatFechaCorta(o.date)}
                    </span>
                    <span style={{ fontFamily: 'var(--fuente-mono)', fontSize: 13 }}>
                      <span style={{ textDecoration: 'line-through', color: 'var(--apagado)' }}>{textoValor(antes)}</span> → {textoValor(ahora)}
                      {o.site !== null ? ` · ${o.site}` : ''}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>{detalle.join(' · ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>Jefatura · {fechaYHora(o.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      disabled={procesando === clave}
                      onClick={() => void deshacer(o)}
                      style={{ ...estiloBotonEnlace, color: 'var(--peligro)' }}
                    >
                      {procesando === clave ? 'Deshaciendo…' : 'Deshacer'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}

const estiloFondo: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(23,26,33,.32)', zIndex: 20 };

const estiloPanel: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  bottom: 16,
  width: 480,
  maxWidth: 'calc(100% - 32px)',
  background: 'var(--superficie)',
  border: '1px solid var(--borde)',
  borderRadius: 16,
  boxShadow: '0 12px 40px rgba(23,26,33,.22)',
  zIndex: 21,
  padding: 22,
  boxSizing: 'border-box',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const estiloFila: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0,1fr) auto',
  gap: '6px 12px',
  padding: '12px 0',
  borderBottom: '1px solid var(--borde-suave-2)',
};

const estiloBotonEnlace: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  background: 'transparent',
  border: 'none',
  padding: 0,
  minHeight: 36,
  cursor: 'pointer',
};

const estiloBotonIcono: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  color: 'var(--texto)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
};
