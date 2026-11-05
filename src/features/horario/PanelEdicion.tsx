/**
 * El panel «Cambiar un día»: turno/libre/vacaciones, horarios rápidos del
 * departamento, alerta de descanso, sede del día, compañeros/apoyo, motivo
 * y nota. Plan §7.5. Ficha: docs/features/horario.md.
 */

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { guardarCambioDia, deshacerCambioDia } from '@/data/horario.ts';
import { SEDES } from '@/domain/catalog.ts';
import { avisosDescanso, companerosYApoyo, turnosFrecuentes } from '@/domain/edicion.ts';
import type { DayOverride } from '@/domain/overlay.ts';
import { diaDe, type IndiceMes } from '@/domain/presence.ts';
import { addDays, formatFechaCorta, formatFechaLarga, formatMinutes, parseMinutes } from '@/domain/time.ts';
import type { DateKey, ScheduleEntry, ShiftValue, SheetPerson } from '@/domain/types.ts';

const MOTIVOS = ['Cambio de turno', 'Apoyo a otra sede', 'Permiso', 'Incapacidad', 'Capacitación', 'Otro'] as const;
const SEDES_DE_CAMBIO = SEDES.filter((s) => s !== 'Sin sede');

function textoValor(shift: ShiftValue): string {
  if (shift.kind === 'work') return `${formatMinutes(shift.startMin)}-${formatMinutes(shift.endMin % 1440)}`;
  if (shift.kind === 'off') return 'Libre';
  if (shift.kind === 'vacation') return 'Vacaciones';
  return 'Sin datos';
}

export function PanelEdicion({
  persona,
  personaKey,
  date,
  valorOriginal,
  valorEfectivo,
  overrideVigente,
  indice,
  indiceOverrides,
  entriesDelMes,
  onGuardado,
  onCerrar,
}: {
  persona: SheetPerson;
  personaKey: string;
  date: DateKey;
  valorOriginal: ShiftValue;
  valorEfectivo: ShiftValue;
  overrideVigente: DayOverride | null;
  indice: IndiceMes;
  indiceOverrides: ReadonlyMap<string, DayOverride>;
  entriesDelMes: readonly ScheduleEntry[];
  onGuardado: (mensaje: string) => void;
  onCerrar: () => void;
}) {
  const [tipo, setTipo] = useState<'turno' | 'libre' | 'vac'>(
    valorEfectivo.kind === 'work' ? 'turno' : valorEfectivo.kind === 'vacation' ? 'vac' : 'libre',
  );
  const [a, setA] = useState(valorEfectivo.kind === 'work' ? formatMinutes(valorEfectivo.startMin) : '06:00');
  const [b, setB] = useState(valorEfectivo.kind === 'work' ? formatMinutes(valorEfectivo.endMin % 1440) : '14:00');
  const [sede, setSede] = useState<string>(overrideVigente?.site ?? (persona.site === 'Sin sede' ? (SEDES_DE_CAMBIO[0] ?? 'Megacentro') : persona.site));
  const [motivo, setMotivo] = useState<string>(
    overrideVigente !== null && (MOTIVOS as readonly string[]).includes(overrideVigente.reason) ? overrideVigente.reason : '',
  );
  const [nota, setNota] = useState(overrideVigente?.note ?? '');
  const [apoyo, setApoyo] = useState<string | null>(overrideVigente?.supportPersonKey ?? null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = useMemo(() => turnosFrecuentes(entriesDelMes, persona.department), [entriesDelMes, persona.department]);

  const startMin = parseMinutes(a);
  const endMinBruto = parseMinutes(b);
  const nuevoTurno = useMemo((): Extract<ShiftValue, { kind: 'work' }> | null => {
    if (tipo !== 'turno' || startMin === null || endMinBruto === null) return null;
    return {
      kind: 'work',
      startMin,
      endMin: endMinBruto <= startMin ? endMinBruto + 1440 : endMinBruto,
      raw: '',
    };
  }, [tipo, startMin, endMinBruto]);

  const avisos = useMemo(() => {
    if (nuevoTurno === null) return [];
    const ayer = diaDe(indice, personaKey, addDays(date, -1))?.shift ?? null;
    const manana = diaDe(indice, personaKey, addDays(date, 1))?.shift ?? null;
    return avisosDescanso(ayer, manana, nuevoTurno);
  }, [indice, personaKey, date, nuevoTurno]);

  const { coincidentes, apoyos } = useMemo(() => {
    if (nuevoTurno === null) return { coincidentes: [], apoyos: [] };
    return companerosYApoyo(indice, indiceOverrides, date, nuevoTurno, sede, personaKey);
  }, [indice, indiceOverrides, date, nuevoTurno, sede, personaKey]);

  const nuevoValor: ShiftValue = tipo === 'turno' ? (nuevoTurno ?? { kind: 'unknown', raw: '' }) : tipo === 'vac' ? { kind: 'vacation', raw: 'Vacaciones' } : { kind: 'off', raw: 'Libre' };
  const sedeDistinta = sede !== persona.site;
  const noValido = motivo === '' || (tipo === 'turno' && (startMin === null || endMinBruto === null));

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await guardarCambioDia({
        personKey: personaKey,
        date,
        kind: tipo === 'turno' ? 'work' : tipo === 'vac' ? 'vacation' : 'off',
        startMin: nuevoTurno?.startMin ?? null,
        endMin: nuevoTurno?.endMin ?? null,
        site: sedeDistinta ? sede : null,
        reason: motivo,
        note: nota.trim() === '' ? null : nota.trim(),
        supportPersonKey: apoyo,
      });
      onGuardado(
        `Cambio guardado: ${persona.displayName}, ${formatFechaCorta(date)} → ${textoValor(nuevoValor)}${sedeDistinta ? ` · ${sede}` : ''}. La persona lo verá en su horario.`,
      );
    } catch {
      setError('No se pudo guardar el cambio. Vuelve a intentarlo.');
      setGuardando(false);
    }
  }

  async function volverALaHoja() {
    setGuardando(true);
    setError(null);
    try {
      await deshacerCambioDia(personaKey, date);
      onGuardado(`Se volvió a lo que dice la hoja para ${persona.displayName}, ${formatFechaCorta(date)}.`);
    } catch {
      setError('No se pudo deshacer el cambio. Vuelve a intentarlo.');
      setGuardando(false);
    }
  }

  return (
    <>
      <div aria-hidden style={{ ...estiloFondo, zIndex: 22 }} onClick={onCerrar} />
      <section role="dialog" aria-modal="true" aria-label="Cambiar un día" style={{ ...estiloPanel, zIndex: 23 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={estiloEtiqueta}>Cambiar un día · {formatFechaLarga(date)}</p>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--fuente-titulo)', fontSize: 20, fontWeight: 700 }}>{persona.displayName}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--texto-3)' }}>
              {persona.department} · en la hoja: <span style={{ fontFamily: 'var(--fuente-mono)' }}>{textoValor(valorOriginal)}</span>
            </p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} style={estiloBotonIcono}>
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={estiloLabel}>Turno</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(['turno', 'libre', 'vac'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} style={estiloChip(tipo === t)}>
                {t === 'turno' ? 'Turno' : t === 'libre' ? 'Libre' : 'Vacaciones'}
              </button>
            ))}
          </div>

          {tipo === 'turno' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {presets.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {presets.map((p) => {
                    const [pa, pb] = p.split('-');
                    const activo = a === pa && b === pb;
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => {
                          setA(pa ?? a);
                          setB(pb ?? b);
                        }}
                        style={{ ...estiloChip(activo), fontFamily: 'var(--fuente-mono)' }}
                      >
                        {p.replace('-', '–')}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor="ea" style={estiloLabelChico}>
                    Entrada
                  </label>
                  <input id="ea" type="time" value={a} onChange={(e) => setA(e.target.value)} style={estiloCampo} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor="eb" style={estiloLabelChico}>
                    Salida
                  </label>
                  <input id="eb" type="time" value={b} onChange={(e) => setB(e.target.value)} style={estiloCampo} />
                </div>
              </div>
            </div>
          )}

          {avisos.length > 0 && (
            <div role="alert" style={estiloAviso}>
              {avisos.join(' ')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={estiloLabel}>Sede ese día</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SEDES_DE_CAMBIO.map((s) => (
              <button key={s} type="button" aria-pressed={sede === s} onClick={() => setSede(s)} style={estiloChip(sede === s)}>
                {s}
                {s === persona.site ? ' (su sede)' : ''}
              </button>
            ))}
          </div>
        </div>

        {tipo === 'turno' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={estiloLabel}>Compañeros con el nuevo horario</span>
            <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>
              {coincidentes.length > 0
                ? coincidentes
                    .slice(0, 6)
                    .map((p) => p.displayName)
                    .join(', ') + (coincidentes.length > 6 ? ` y ${coincidentes.length - 6} más` : '')
                : `Nadie en ${sede} tiene exactamente ese horario.`}
            </span>
            <span style={estiloLabelChico}>Asignar apoyo con (opcional)</span>
            {apoyos.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {apoyos.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={apoyo === p.key}
                    onClick={() => setApoyo((actual) => (actual === p.key ? null : p.key))}
                    style={estiloChip(apoyo === p.key)}
                  >
                    {p.displayName} · {p.role}
                  </button>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--texto-3)' }}>Nadie más en esa sede coincide con ese horario.</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={estiloLabel}>Detalle del cambio</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MOTIVOS.map((m) => (
              <button key={m} type="button" aria-pressed={motivo === m} onClick={() => setMotivo(m)} style={estiloChip(motivo === m)}>
                {m}
              </button>
            ))}
          </div>
          <label htmlFor="enota" style={estiloLabelChico}>
            Nota para la persona
          </label>
          <textarea
            id="enota"
            rows={3}
            placeholder="Ej.: cubre la mañana en Megacentro"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            style={{ ...estiloCampo, minHeight: 76, padding: '10px 12px', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 12, borderTop: '1px solid var(--borde-suave)' }}>
          <span style={{ fontSize: 13, color: 'var(--texto-2)' }}>
            Vista previa: <span style={{ fontFamily: 'var(--fuente-mono)', textDecoration: 'line-through', color: 'var(--apagado)' }}>{textoValor(valorOriginal)}</span> →{' '}
            <span style={{ fontFamily: 'var(--fuente-mono)', fontWeight: 600 }}>
              {textoValor(nuevoValor)}
              {sedeDistinta ? ` · ${sede}` : ''}
            </span>
          </span>
          {error !== null && <span style={{ fontSize: 13, color: 'var(--peligro)' }}>{error}</span>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" disabled={noValido || guardando} onClick={() => void guardar()} style={estiloBotonPrimario(noValido || guardando)}>
            {guardando ? 'Guardando…' : 'Guardar cambio'}
          </button>
          <button type="button" onClick={onCerrar} style={estiloBotonSecundario}>
            Cancelar
          </button>
          {overrideVigente !== null && (
            <button type="button" disabled={guardando} onClick={() => void volverALaHoja()} style={{ ...estiloBotonSecundario, color: 'var(--peligro)' }}>
              Volver a lo de la hoja
            </button>
          )}
        </div>
      </section>
    </>
  );
}

const estiloFondo: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(23,26,33,.32)' };

const estiloPanel: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  bottom: 16,
  width: 520,
  maxWidth: 'calc(100% - 32px)',
  background: 'var(--superficie)',
  border: '1px solid var(--borde)',
  borderRadius: 16,
  boxShadow: '0 12px 40px rgba(23,26,33,.22)',
  padding: 22,
  boxSizing: 'border-box',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const estiloEtiqueta: CSSProperties = {
  margin: 0,
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--texto-3)',
  fontWeight: 600,
};

const estiloLabel: CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--texto-2)' };
const estiloLabelChico: CSSProperties = { fontSize: 12, color: 'var(--texto-3)', fontWeight: 600 };

const estiloCampo: CSSProperties = {
  minHeight: 'var(--tactil-min)',
  boxSizing: 'border-box',
  padding: '0 12px',
  border: '1px solid var(--borde)',
  borderRadius: 'var(--radio-control)',
  font: 'inherit',
  fontSize: 14,
  color: 'var(--texto)',
  background: 'var(--superficie)',
  width: '100%',
};

const estiloAviso: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 'var(--radio-control)',
  background: 'var(--aviso-fondo)',
  border: '1px solid var(--aviso-borde)',
  color: 'var(--aviso-texto)',
  fontSize: 13,
};

function estiloChip(activo: boolean): CSSProperties {
  return {
    minHeight: 'var(--tactil-min)',
    padding: '0 12px',
    borderRadius: 'var(--radio-chip)',
    border: `1px solid ${activo ? 'var(--primario)' : 'var(--borde)'}`,
    background: activo ? 'var(--primario)' : 'var(--superficie)',
    color: activo ? '#fff' : 'var(--texto)',
    font: 'inherit',
    fontSize: 13,
    cursor: 'pointer',
  };
}

function estiloBotonPrimario(deshabilitado: boolean): CSSProperties {
  return {
    minHeight: 'var(--tactil-min)',
    padding: '0 16px',
    borderRadius: 'var(--radio-control)',
    border: 'none',
    background: deshabilitado ? 'var(--borde-suave)' : 'var(--primario)',
    color: deshabilitado ? 'var(--apagado)' : '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: deshabilitado ? 'not-allowed' : 'pointer',
  };
}

const estiloBotonSecundario: CSSProperties = {
  minHeight: 'var(--tactil-min)',
  padding: '0 14px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  color: 'var(--texto)',
  cursor: 'pointer',
  fontSize: 14,
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
