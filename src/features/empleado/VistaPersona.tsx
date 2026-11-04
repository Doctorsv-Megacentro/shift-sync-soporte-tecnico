/**
 * El cuerpo de la vista de empleado: buscador, semana, tarjeta del día (con
 * la caja de cambio de jefatura si aplica) y «quién está ese día». Plan
 * §7.1, capturas 01–05. Ficha: docs/features/empleado.md.
 */

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { VistaCompartida } from '@/data/sharedView.ts';
import { esRolDeSoporteEnSede } from '@/domain/catalog.ts';
import { aplicarCambios, buscarOverride, indexarOverrides, type DayOverride } from '@/domain/overlay.ts';
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
  formatMinutes,
  nombreDia,
  nombreMes,
  startOfWeek,
  toDateKey,
  weekDates,
} from '@/domain/time.ts';
import type { DateKey, ParsedMonth, Role, ShiftValue } from '@/domain/types.ts';
import { COLOR_CATEGORIA, COLOR_ROL, ETIQUETA_CATEGORIA } from '@/ui/colorRol.ts';
import { guardarPersona, leerPersonaGuardada } from './almacenPersona.ts';

const ETIQUETA_ALCANCE: Record<Alcance, string> = {
  'mismo-horario': 'Mismo horario',
  'mi-equipo': 'Mi equipo',
  'toda-la-operacion': 'Toda la operación',
};

function hoyDateKey(): DateKey {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()) ?? '1970-01-01';
}

/** Junta los meses de la vista en uno solo, para navegar semanas sin cortes de mes. */
function combinarMeses(meses: readonly ParsedMonth[]): ParsedMonth {
  const personas = new Map(meses.flatMap((m) => m.people).map((p) => [p.key, p]));
  return {
    sheetName: 'combinado',
    hidden: false,
    month: meses[0]?.month ?? '',
    dates: meses.flatMap((m) => m.dates),
    people: [...personas.values()],
    entries: meses.flatMap((m) => m.entries),
  };
}

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

/** «LUNES 2 NOV», como en la tarjeta del día de las capturas. */
function fechaCorta(date: DateKey): string {
  const dia = formatFechaCorta(date); // «2 nov»
  return `${nombreDia(date).toUpperCase()} ${dia.toUpperCase()}`;
}

function fechaYHora(iso: string): string {
  const d = new Date(iso);
  const dia = toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const horaMin = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${dia ? formatFechaCorta(dia) : ''} · ${horaMin}`;
}

export function VistaPersona({ slug, vista }: { slug: string; vista: VistaCompartida }) {
  const mesCombinado = useMemo(() => combinarMeses(vista.months), [vista.months]);
  const indiceOverrides = useMemo(() => indexarOverrides(vista.overrides), [vista.overrides]);
  const entradasEfectivas = useMemo(
    () => aplicarCambios(mesCombinado.entries, vista.overrides),
    [mesCombinado, vista.overrides],
  );
  const mesEfectivo = useMemo(() => ({ ...mesCombinado, entries: entradasEfectivas }), [mesCombinado, entradasEfectivas]);
  const indice = useMemo(() => indexarMes(mesEfectivo), [mesEfectivo]);
  const indiceOriginal = useMemo(() => indexarMes(mesCombinado), [mesCombinado]);

  const hoy = hoyDateKey();
  const primerDiaConDatos = mesCombinado.dates[0] ?? hoy;
  const diaInicial = mesCombinado.dates.includes(hoy) ? hoy : primerDiaConDatos;

  const [personaKey, setPersonaKey] = useState<string | null>(() => {
    const guardada = leerPersonaGuardada(slug);
    return guardada !== null && indice.personas.has(guardada) ? guardada : null;
  });
  const [mostrandoKey, setMostrandoKey] = useState<string | null>(null);
  const [consulta, setConsulta] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState<DateKey>(diaInicial);
  const [alcance, setAlcance] = useState<Alcance>('mismo-horario');

  const resultados = useMemo(() => buscarPersonas(mesCombinado, consulta), [mesCombinado, consulta]);

  const claveMostrada = mostrandoKey ?? personaKey;
  const persona = claveMostrada === null ? null : indice.personas.get(claveMostrada) ?? null;

  function elegirPersona(key: string) {
    setPersonaKey(key);
    guardarPersona(slug, key);
    setConsulta('');
    const propia = diaDe(indice, key, diaSeleccionado);
    setDiaSeleccionado(propia !== null ? diaSeleccionado : (mesCombinado.dates[0] ?? diaSeleccionado));
  }

  const fuenteTexto =
    vista.source === null
      ? null
      : vista.source.source === 'sheet'
        ? `Google Sheet · actualizado ${fechaYHora(vista.source.importedAt)}`
        : `Excel · cargado ${fechaYHora(vista.source.importedAt)}`;

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '1.25rem 1.5rem 3rem' }}>
      <header style={estiloCabecera}>
        <div>
          <strong style={{ fontSize: 17 }}>ShiftSync</strong>
          <span style={{ color: 'var(--texto-3)' }}>
            {' '}
            · Horario de la operación
            {mesCombinado.month !== '' && ` · ${capitaliza(nombreMes(mesCombinado.month))} ${mesCombinado.month.slice(0, 4)}`}
          </span>
        </div>
        {fuenteTexto !== null && (
          <span style={estiloPildoraFuente}>
            <span style={estiloPuntoFuente} aria-hidden /> {fuenteTexto}
          </span>
        )}
      </header>

      <section style={estiloTarjeta}>
        <p style={estiloEtiqueta}>¿Quién eres?</p>
        <input
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Escribe tu nombre, por ejemplo Josué o Yenifer"
          style={estiloCampo}
        />
        {consulta.trim() !== '' && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
            {resultados.map((p) => (
              <li key={p.key} style={estiloFilaResultado}>
                <span aria-hidden style={{ ...estiloPuntoRol, background: COLOR_ROL[p.role].borde }} />
                <button type="button" onClick={() => elegirPersona(p.key)} style={estiloBotonResultado}>
                  <strong>{p.displayName}</strong>
                  <span style={estiloEtiquetaRol(p.role)}>{p.role}</span>
                  {esRolDeSoporteEnSede(p.role) || p.site !== 'Sin sede' ? (
                    <span style={estiloEtiquetaSede}>{p.site.toUpperCase()}</span>
                  ) : null}
                  <span style={{ color: 'var(--texto-3)', fontSize: 13 }}>{p.department}</span>
                  {p.joinedOn !== null && (
                    <span style={{ color: 'var(--texto-3)', fontSize: 13 }}>
                      Ingresa {formatFechaCorta(p.joinedOn)}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {resultados.length === 0 && <li style={{ color: 'var(--apagado)' }}>Sin resultados.</li>}
          </ul>
        )}
        {persona !== null && (
          <p style={{ marginTop: 10, marginBottom: 0 }}>
            Tu horario · <strong>{persona.displayName}</strong>{' '}
            <span style={estiloEtiquetaRol(persona.role)}>{persona.role}</span>{' '}
            <span style={estiloEtiquetaSede}>{persona.site.toUpperCase()}</span>{' '}
            <span style={{ color: 'var(--texto-3)', fontSize: 13 }}>{persona.department}</span>
          </p>
        )}
        {mostrandoKey !== null && mostrandoKey !== personaKey && (
          <button type="button" onClick={() => setMostrandoKey(null)} style={{ ...estiloBotonSecundario, marginTop: 10 }}>
            Volver a mi horario
          </button>
        )}
      </section>

      {persona === null ? null : (
        <CuerpoPersona
          persona={persona}
          personaKey={persona.key}
          indice={indice}
          indiceOriginal={indiceOriginal}
          indiceOverrides={indiceOverrides}
          mesCombinado={mesCombinado}
          diaSeleccionado={diaSeleccionado}
          onDiaSeleccionado={setDiaSeleccionado}
          alcance={alcance}
          onAlcance={setAlcance}
          onMostrarPersona={setMostrandoKey}
          hoy={hoy}
        />
      )}

      <section style={{ ...estiloTarjeta, marginTop: 20 }}>
        <p style={estiloEtiqueta}>Próximamente</p>
        <div style={estiloGridProximamente}>
          {['Pasar a Google Calendar', 'Avisos para marcar', 'Cronómetro de horas', 'Vista de mes'].map((t) => (
            <div key={t} style={estiloTarjetaProximamente}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t}</div>
              <div style={{ fontSize: 11, color: 'var(--apagado)', textTransform: 'uppercase', marginTop: 4 }}>
                Próximamente
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function CuerpoPersona(props: {
  persona: { key: string; displayName: string; role: Role; site: string; department: string };
  personaKey: string;
  indice: ReturnType<typeof indexarMes>;
  indiceOriginal: ReturnType<typeof indexarMes>;
  indiceOverrides: Map<string, DayOverride>;
  mesCombinado: ParsedMonth;
  diaSeleccionado: DateKey;
  onDiaSeleccionado: (d: DateKey) => void;
  alcance: Alcance;
  onAlcance: (a: Alcance) => void;
  onMostrarPersona: (key: string) => void;
  hoy: DateKey;
}) {
  const {
    personaKey,
    indice,
    indiceOriginal,
    indiceOverrides,
    diaSeleccionado,
    onDiaSeleccionado,
    alcance,
    onAlcance,
    onMostrarPersona,
    hoy,
  } = props;

  const semana = weekDates(diaSeleccionado);
  const resumen = resumirSemana(indice, personaKey, semana);
  const diaActual = diaDe(indice, personaKey, diaSeleccionado);
  const diaOriginal = diaDe(indiceOriginal, personaKey, diaSeleccionado);
  const override = buscarOverride(indiceOverrides, personaKey, diaSeleccionado);
  const puedeMismoHorario = diaActual !== null && diaActual.shift.kind === 'work';

  const presentes = quienEsta(indice, diaSeleccionado, alcance, personaKey);
  const grupos = agruparPorEntrada(presentes);

  return (
    <>
      <section style={estiloTarjeta}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <p style={{ ...estiloEtiqueta, margin: 0 }}>Tu semana</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              aria-label="Semana anterior"
              onClick={() => onDiaSeleccionado(addDays(startOfWeek(diaSeleccionado), -7))}
              style={estiloFlecha}
            >
              ‹
            </button>
            <span style={{ fontSize: 13, color: 'var(--texto-3)' }}>
              {formatFechaCorta(semana[0] ?? diaSeleccionado)} – {formatFechaCorta(semana[6] ?? diaSeleccionado)}
            </span>
            <button
              type="button"
              aria-label="Semana siguiente"
              onClick={() => onDiaSeleccionado(addDays(startOfWeek(diaSeleccionado), 7))}
              style={estiloFlecha}
            >
              ›
            </button>
          </div>
        </div>

        <div className="ss-semana">
          {semana.map((fecha) => {
            const entry = diaDe(indice, personaKey, fecha);
            const tieneCambio = buscarOverride(indiceOverrides, personaKey, fecha) !== null;
            const categoria = entry !== null ? shiftCategory(entry.shift) : null;
            return (
              <button
                key={fecha}
                type="button"
                className="ss-dia"
                aria-current={fecha === diaSeleccionado}
                onClick={() => onDiaSeleccionado(fecha)}
              >
                {tieneCambio && <span className="ss-punto-cambio" aria-hidden />}
                <div className="ss-dia-etiqueta">{fecha === hoy ? 'Hoy' : nombreDia(fecha).slice(0, 3)}</div>
                <div className="ss-dia-numero">{fecha.slice(-2)}</div>
                <div
                  className="ss-dia-horario"
                  style={
                    categoria !== null
                      ? { background: COLOR_CATEGORIA[categoria]?.fondo, color: COLOR_CATEGORIA[categoria]?.texto, borderRadius: 6, padding: '2px 0' }
                      : undefined
                  }
                >
                  {/* Escritorio: el rango completo. Móvil: solo la entrada, con el
                      fondo de color como «punto de color por día» (plan §7.8-3). */}
                  <span className="ss-solo-escritorio">{textoDelDia(entry?.shift)}</span>
                  <span className="ss-solo-movil-texto">
                    {entry?.shift.kind === 'work' ? formatMinutes(entry.shift.startMin) : textoDelDia(entry?.shift)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 13, color: 'var(--texto-3)', marginTop: 10, marginBottom: 0 }}>
          {resumen.turnos} {resumen.turnos === 1 ? 'turno' : 'turnos'} · {formatDuration(resumen.minutos)} en la
          semana · el punto naranja marca un cambio hecho por jefatura
        </p>
      </section>

      <section style={{ ...estiloTarjeta, borderLeft: '4px solid var(--cambio-jefatura)' }}>
        <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--texto-3)' }}>
          {fechaCorta(diaSeleccionado)}
          {diaSeleccionado === hoy ? ' · HOY' : ''}
        </div>
        {diaActual === null ? (
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Sin datos</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--fuente-mono)' }}>
                {textoDelDia(diaActual.shift)}
              </div>
              {diaActual.shift.kind === 'work' && (
                <span style={{ ...estiloPildoraCategoria, ...COLOR_CATEGORIA[shiftCategory(diaActual.shift)] }}>
                  {ETIQUETA_CATEGORIA[shiftCategory(diaActual.shift)]}
                </span>
              )}
            </div>
            {diaActual.shift.kind === 'work' && (
              <div style={{ fontSize: 13, color: 'var(--texto-3)', marginTop: 4 }}>
                {formatDuration(shiftDuration(diaActual.shift) ?? 0)} · {diaActual.department}
                {endsNextDay(diaActual.shift) ? ' · termina al día siguiente' : ''}
              </div>
            )}

            {override !== null && (
              <div style={estiloCajaCambio}>
                <strong>Cambio hecho por jefatura · {fechaYHora(override.createdAt)}</strong>
                {diaOriginal !== null && (
                  <div>
                    Antes{' '}
                    <span style={{ textDecoration: 'line-through' }}>{textoDelDia(diaOriginal.shift)}</span> · Motivo:{' '}
                    {override.reason}
                  </div>
                )}
                {override.note !== null && override.note !== '' && <div>Nota de jefatura: {override.note}</div>}
              </div>
            )}
          </>
        )}
      </section>

      <section style={estiloTarjeta}>
        <p style={estiloEtiqueta}>Quién está ese día</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {(['mismo-horario', 'mi-equipo', 'toda-la-operacion'] as const).map((a) => {
            const deshabilitado = a === 'mismo-horario' && !puedeMismoHorario;
            return (
              <button
                key={a}
                type="button"
                disabled={deshabilitado}
                aria-pressed={alcance === a}
                onClick={() => onAlcance(a)}
                style={{
                  ...estiloChip,
                  opacity: deshabilitado ? 0.4 : 1,
                  background: alcance === a ? 'var(--texto)' : 'var(--superficie)',
                  color: alcance === a ? '#fff' : 'var(--texto)',
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
          <>
            {grupos.map((g) => (
              <div key={g.hora} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--texto-3)', marginBottom: 4 }}>
                  Entran {g.hora} · {g.personas.length}
                </div>
                {g.personas.map(({ person: p, shift }, i) => (
                  // La clave de persona puede repetirse si la hoja trae una
                  // fila duplicada para la misma persona (aviso
                  // persona-duplicada): se añade la posición para que React
                  // nunca vea dos hijos con la misma key.
                  <button
                    key={`${p.key}-${i}`}
                    type="button"
                    className="ss-fila-presencia"
                    onClick={() => onMostrarPersona(p.key)}
                  >
                    <span className="ss-punto-rol" aria-hidden style={{ background: COLOR_ROL[p.role].borde }} />
                    <span className="ss-nombre">{p.displayName}</span>
                    <span style={estiloEtiquetaRol(p.role)}>{p.role}</span>
                    <span className="ss-meta">
                      {p.site} · {p.department}
                    </span>
                    <span className="ss-horario">{textoDelDia(shift)}</span>
                  </button>
                ))}
              </div>
            ))}
            <p style={{ fontSize: 13, color: 'var(--texto-3)', marginTop: 8 }}>Toca a una persona para ver su horario.</p>
          </>
        )}
      </section>
    </>
  );
}

function capitaliza(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

function estiloEtiquetaRol(role: Role): CSSProperties {
  const c = COLOR_ROL[role];
  return {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '2px 7px',
    borderRadius: 'var(--radio-etiqueta)',
    background: c.fondo,
    color: c.texto,
  };
}

const estiloEtiquetaSede: CSSProperties = {
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  padding: '2px 7px',
  borderRadius: 'var(--radio-etiqueta)',
  border: '1px solid var(--sede-borde)',
  color: 'var(--texto-2)',
};

const estiloCabecera: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
  padding: '1rem 0',
  borderBottom: '1px solid var(--borde-suave)',
  marginBottom: 20,
};

const estiloPildoraFuente: CSSProperties = {
  fontSize: 12,
  color: 'var(--texto-3)',
  border: '1px solid var(--borde-suave)',
  borderRadius: 'var(--radio-chip)',
  padding: '4px 10px',
};

const estiloPuntoFuente: CSSProperties = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--primario)',
};

const estiloTarjeta: CSSProperties = {
  border: '1px solid var(--borde-suave)',
  borderRadius: 'var(--radio-tarjeta)',
  padding: 16,
  marginBottom: 16,
  background: 'var(--superficie)',
};

const estiloEtiqueta: CSSProperties = {
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--apagado)',
  fontWeight: 600,
  margin: '0 0 10px',
};

const estiloCampo: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  fontSize: 15,
  boxSizing: 'border-box',
};

const estiloFilaResultado: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 0',
};

const estiloBotonResultado: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  padding: '4px 0',
  minHeight: 'var(--tactil-min)',
  font: 'inherit',
};

const estiloPuntoRol: CSSProperties = { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 };

const estiloBotonSecundario: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  cursor: 'pointer',
  fontSize: 13,
  minHeight: 'var(--tactil-min)',
};

const estiloFlecha: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
};

const estiloPildoraCategoria: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: 'var(--radio-chip)',
};

const estiloCajaCambio: CSSProperties = {
  marginTop: 12,
  background: 'var(--aviso-fondo)',
  border: '1px solid var(--aviso-borde)',
  color: 'var(--aviso-texto)',
  borderRadius: 'var(--radio-control)',
  padding: '10px 12px',
  fontSize: 13,
  lineHeight: 1.6,
};

const estiloChip: CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--radio-chip)',
  border: '1px solid var(--borde-suave)',
  fontSize: 13,
  cursor: 'pointer',
  minHeight: 'var(--tactil-min)',
};

const estiloGridProximamente: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const estiloTarjetaProximamente: CSSProperties = {
  border: '1px dashed var(--borde-suave)',
  borderRadius: 'var(--radio-control)',
  padding: 12,
};
