/**
 * Buscador, semana, tarjeta del día y «quién está ese día» para un mes ya
 * leído. Es la vista de empleado simplificada de la demo local (ADR-0014);
 * ficha: docs/features/demo.md. La Fase 3 construye la versión real.
 */

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { esRolDeSoporteEnSede } from '@/domain/catalog.ts';
import {
  agruparPorEntrada,
  buscarPersonas,
  diaDe,
  indexarMes,
  quienEsta,
  resumirSemana,
  type Alcance,
} from '@/domain/presence.ts';
import { endsNextDay, shiftCategory, shiftDuration } from '@/domain/shift.ts';
import {
  addDays,
  formatDuration,
  formatFechaCorta,
  formatFechaLarga,
  formatMinutes,
  nombreDia,
  startOfWeek,
  weekDates,
} from '@/domain/time.ts';
import type { DateKey, ParsedMonth, Role, ShiftValue } from '@/domain/types.ts';

const ETIQUETA_CATEGORIA: Record<string, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
  libre: 'Libre',
  vacaciones: 'Vacaciones',
};

const COLOR_ROL: Record<Role, { fondo: string; texto: string; borde: string }> = {
  N1: { fondo: 'var(--rol-n1-fondo)', texto: 'var(--rol-n1-texto)', borde: 'var(--rol-n1-borde)' },
  N2: { fondo: 'var(--rol-n2-fondo)', texto: 'var(--rol-n2-texto)', borde: 'var(--rol-n2-borde)' },
  Supervisor: {
    fondo: 'var(--rol-supervisor-fondo)',
    texto: 'var(--rol-supervisor-texto)',
    borde: 'var(--rol-supervisor-borde)',
  },
  Coordinador: {
    fondo: 'var(--rol-coordinador-fondo)',
    texto: 'var(--rol-coordinador-texto)',
    borde: 'var(--rol-coordinador-borde)',
  },
  Producto: {
    fondo: 'var(--rol-producto-fondo)',
    texto: 'var(--rol-producto-texto)',
    borde: 'var(--rol-producto-borde)',
  },
  Tercería: {
    fondo: 'var(--rol-terceria-fondo)',
    texto: 'var(--rol-terceria-texto)',
    borde: 'var(--rol-terceria-borde)',
  },
  Redes: { fondo: 'var(--rol-redes-fondo)', texto: 'var(--rol-redes-texto)', borde: 'var(--rol-redes-borde)' },
  'Soporte de Salas': {
    fondo: 'var(--rol-salas-fondo)',
    texto: 'var(--rol-salas-texto)',
    borde: 'var(--rol-salas-borde)',
  },
  QA: { fondo: 'var(--rol-qa-fondo)', texto: 'var(--rol-qa-texto)', borde: 'var(--rol-qa-borde)' },
  'Activo Fijo': {
    fondo: 'var(--rol-activofijo-fondo)',
    texto: 'var(--rol-activofijo-texto)',
    borde: 'var(--rol-activofijo-borde)',
  },
  Otro: { fondo: 'var(--sinsede-fondo)', texto: 'var(--sinsede-texto)', borde: 'var(--sede-borde)' },
};

/** Lo que se lee en la tira semanal y en la tarjeta del día. */
function textoDelDia(shift: ShiftValue | undefined): string {
  if (shift === undefined) return 'Sin datos';
  switch (shift.kind) {
    case 'work':
      return `${formatMinutes(shift.startMin)}–${formatMinutes(shift.endMin % 1440)}`;
    case 'off':
      return 'Libre';
    case 'vacation':
      return 'Vacaciones';
    case 'unknown':
      return 'Sin datos';
  }
}

const ETIQUETA_ALCANCE: Record<Alcance, string> = {
  'mismo-horario': 'Mismo horario',
  'mi-equipo': 'Mi equipo',
  'toda-la-operacion': 'Toda la operación',
};

export function VistaEmpleado({ mes }: { mes: ParsedMonth }) {
  const indice = useMemo(() => indexarMes(mes), [mes]);

  // La persona que inició sesión («soy esta persona») y la que se está
  // mirando ahora mismo, que puede ser otra si se tocó una fila de «Quién
  // está ese día». «Volver a mi horario» recupera la propia (plan §7.1).
  const [personaKey, setPersonaKey] = useState<string | null>(null);
  const [mostrandoKey, setMostrandoKey] = useState<string | null>(null);
  const [consulta, setConsulta] = useState('');
  const primerDia = mes.dates[0] ?? mes.month;
  const [diaSeleccionado, setDiaSeleccionado] = useState<DateKey>(primerDia);
  const [alcance, setAlcance] = useState<Alcance>('mismo-horario');

  const resultados = useMemo(() => buscarPersonas(mes, consulta), [mes, consulta]);

  const claveMostrada = mostrandoKey ?? personaKey;
  const persona = claveMostrada === null ? null : indice.personas.get(claveMostrada) ?? null;

  if (persona === null) {
    return (
      <section style={{ maxWidth: 480, margin: '0 auto' }}>
        <p style={estiloEtiqueta}>¿Quién eres?</p>
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Busca tu nombre…"
          style={estiloCampo}
          autoFocus
        />
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {resultados.map((p) => (
            <li
              key={p.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                border: '1px solid var(--borde-suave)',
                borderRadius: 'var(--radio-control)',
                marginBottom: 8,
                background: 'var(--superficie)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: COLOR_ROL[p.role].borde,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.displayName}</div>
                <div style={{ fontSize: 13, color: 'var(--texto-3)' }}>
                  {p.role} · {p.site}
                  {p.department !== '' ? ` · ${p.department}` : ''}
                  {p.joinedOn !== null ? ` · Ingresa ${formatFechaCorta(p.joinedOn)}` : ''}
                </div>
              </div>
              <button type="button" onClick={() => setPersonaKey(p.key)} style={estiloBotonPrimario}>
                Soy esta persona
              </button>
            </li>
          ))}
          {consulta.trim() !== '' && resultados.length === 0 && (
            <li style={{ color: 'var(--apagado)', padding: '8px 4px' }}>Sin resultados.</li>
          )}
        </ul>
      </section>
    );
  }

  const semana = weekDates(diaSeleccionado);
  const resumen = resumirSemana(indice, persona.key, semana);
  const diaActual = diaDe(indice, persona.key, diaSeleccionado);
  const puedeMismoHorario = diaActual !== null && diaActual.shift.kind === 'work';

  const presentes = quienEsta(indice, diaSeleccionado, alcance, persona.key);
  const grupos = agruparPorEntrada(presentes);

  return (
    <section style={{ maxWidth: 640, margin: '0 auto' }}>
      <header style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>{persona.displayName}</div>
        <div style={{ fontSize: 13, color: 'var(--texto-3)' }}>
          {persona.role} · {persona.site}
        </div>
        {mostrandoKey !== null && mostrandoKey !== personaKey && (
          <button
            type="button"
            onClick={() => setMostrandoKey(null)}
            style={{ ...estiloBotonSecundario, marginTop: 8 }}
          >
            Volver a mi horario
          </button>
        )}
      </header>

      <p style={estiloEtiqueta}>Tu semana</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {semana.map((fecha) => {
          const entry = diaDe(indice, persona.key, fecha);
          const activo = fecha === diaSeleccionado;
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => setDiaSeleccionado(fecha)}
              style={{
                ...estiloBotonDia,
                background: activo ? 'var(--primario-suave)' : 'var(--superficie)',
                borderColor: activo ? 'var(--primario)' : 'var(--borde-suave)',
              }}
            >
              <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--texto-3)' }}>
                {nombreDia(fecha).slice(0, 3)}
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{textoDelDia(entry?.shift)}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 13, color: 'var(--texto-3)', marginBottom: 8 }}>
        {resumen.turnos} {resumen.turnos === 1 ? 'turno' : 'turnos'} ·{' '}
        {formatDuration(resumen.minutos)} en la semana
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button type="button" onClick={() => setDiaSeleccionado(addDays(startOfWeek(diaSeleccionado), -7))} style={estiloBotonSecundario}>
          ← Semana anterior
        </button>
        <button type="button" onClick={() => setDiaSeleccionado(addDays(startOfWeek(diaSeleccionado), 7))} style={estiloBotonSecundario}>
          Semana siguiente →
        </button>
      </div>

      <div
        style={{
          border: '1px solid var(--borde-suave)',
          borderRadius: 'var(--radio-tarjeta)',
          padding: 16,
          marginBottom: 20,
          background: 'var(--superficie)',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--texto-3)', marginBottom: 4 }}>
          {formatFechaLarga(diaSeleccionado)}
        </div>
        {diaActual === null ? (
          <div style={{ fontSize: 20, fontWeight: 600 }}>Sin datos</div>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--fuente-mono)' }}>
              {textoDelDia(diaActual.shift)}
              {endsNextDay(diaActual.shift) && (
                <span style={{ fontSize: 13, marginLeft: 8, color: 'var(--texto-3)' }}>
                  termina al día siguiente
                </span>
              )}
            </div>
            {diaActual.shift.kind === 'work' && (
              <div style={{ fontSize: 13, color: 'var(--texto-3)', marginTop: 4 }}>
                {formatDuration(shiftDuration(diaActual.shift) ?? 0)} ·{' '}
                {ETIQUETA_CATEGORIA[shiftCategory(diaActual.shift)]} · {diaActual.department}
              </div>
            )}
          </>
        )}
      </div>

      <p style={estiloEtiqueta}>Quién está ese día</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['mismo-horario', 'mi-equipo', 'toda-la-operacion'] as const).map((a) => {
          const deshabilitado = a === 'mismo-horario' && !puedeMismoHorario;
          return (
            <button
              key={a}
              type="button"
              disabled={deshabilitado}
              aria-pressed={alcance === a}
              onClick={() => setAlcance(a)}
              style={{
                ...estiloChip,
                opacity: deshabilitado ? 0.4 : 1,
                background: alcance === a ? 'var(--primario-suave)' : 'var(--superficie)',
                borderColor: alcance === a ? 'var(--primario)' : 'var(--borde-suave)',
              }}
            >
              {ETIQUETA_ALCANCE[a]} · {a === alcance ? presentes.length : ''}
            </button>
          );
        })}
      </div>

      {grupos.length === 0 ? (
        <p style={{ color: 'var(--apagado)' }}>Nadie en este alcance.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.hora} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--texto-3)', marginBottom: 4 }}>
              Entran {g.hora} · {g.personas.length}
            </div>
            {g.personas.map(({ person: p, shift }) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setMostrandoKey(p.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  border: '1px solid var(--borde-suave-2)',
                  borderRadius: 'var(--radio-control)',
                  marginBottom: 4,
                  background: 'var(--superficie)',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: COLOR_ROL[p.role].borde,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 14 }}>{p.displayName}</span>
                <span style={{ fontSize: 12, color: 'var(--texto-3)' }}>
                  {p.role} · {p.site}
                  {esRolDeSoporteEnSede(p.role) ? '' : ` · ${p.department}`}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--fuente-mono)' }}>
                  {textoDelDia(shift)}
                </span>
              </button>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

const estiloEtiqueta: CSSProperties = {
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--apagado)',
  fontWeight: 600,
  margin: '0 0 8px',
};

const estiloCampo: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  fontSize: 15,
  boxSizing: 'border-box',
};

const estiloBotonPrimario: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radio-control)',
  border: 'none',
  background: 'var(--primario)',
  color: '#fff',
  fontSize: 13,
  cursor: 'pointer',
  minHeight: 'var(--tactil-min)',
};

const estiloBotonSecundario: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  color: 'var(--texto)',
  fontSize: 13,
  cursor: 'pointer',
  minHeight: 'var(--tactil-min)',
};

const estiloBotonDia: CSSProperties = {
  flex: 1,
  padding: '8px 4px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde-suave)',
  cursor: 'pointer',
  minHeight: 'var(--tactil-min)',
};

const estiloChip: CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radio-chip)',
  border: '1px solid var(--borde-suave)',
  fontSize: 13,
  cursor: 'pointer',
  minHeight: 'var(--tactil-min)',
};
