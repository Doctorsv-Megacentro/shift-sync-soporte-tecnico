/**
 * El horario completo de jefatura: filtros, vista Semana (grupos por
 * departamento, grid con nombre fijo), vista Día (línea de tiempo 00–24), el
 * panel «Cambiar un día», el registro y entradas hacia Compartir. Plan
 * §7.4–§7.6. Ficha: docs/features/horario.md.
 */

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { HorarioCompleto } from '@/data/horario.ts';
import { ROLES, SEDES } from '@/domain/catalog.ts';
import {
  agruparPorDepartamento,
  barraDeAyer,
  barraDeHoy,
  contarEnTurno,
  filtrarPersonas,
  type FiltrosHorario,
} from '@/domain/grid.ts';
import { buscarOverride, indexarOverrides, tieneCambio, aplicarCambios, type DayOverride } from '@/domain/overlay.ts';
import { combinarMeses, diaDe, indexarMes, resumirSemana, type IndiceMes } from '@/domain/presence.ts';
import { endsNextDay, shiftCategory } from '@/domain/shift.ts';
import {
  addDays,
  formatDuration,
  formatFechaCorta,
  formatMinutes,
  nombreDia,
  toDateKey,
  weekDates,
} from '@/domain/time.ts';
import type { DateKey, Role, SheetPerson, ShiftValue } from '@/domain/types.ts';
import { COLOR_CATEGORIA, COLOR_ROL } from '@/ui/colorRol.ts';
import './horario.css';
import { PanelEdicion } from './PanelEdicion.tsx';
import { RegistroCambios } from './RegistroCambios.tsx';

type Modo = 'semana' | 'dia';

function hoyDateKey(): DateKey {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate()) ?? '1970-01-01';
}

function textoTurno(shift: ShiftValue | undefined): { a: string; b: string } {
  if (shift === undefined || shift.kind === 'unknown') return { a: 'Sin datos', b: '' };
  if (shift.kind === 'off') return { a: 'Libre', b: '' };
  if (shift.kind === 'vacation') return { a: 'Vacaciones', b: '' };
  return { a: formatMinutes(shift.startMin), b: `→ ${formatMinutes(shift.endMin % 1440)}${endsNextDay(shift) ? ' +1' : ''}` };
}

export function VistaHorario({ horario, onCambio }: { horario: HorarioCompleto; onCambio: () => Promise<void> }) {
  const mesCombinado = useMemo(() => combinarMeses(horario.months), [horario.months]);
  const indiceOriginal = useMemo(() => indexarMes(mesCombinado), [mesCombinado]);
  const indiceOverrides = useMemo(() => indexarOverrides(horario.overrides), [horario.overrides]);
  const entradasEfectivas = useMemo(
    () => aplicarCambios(mesCombinado.entries, horario.overrides),
    [mesCombinado, horario.overrides],
  );
  const mesEfectivo = useMemo(() => ({ ...mesCombinado, entries: entradasEfectivas }), [mesCombinado, entradasEfectivas]);
  const indice = useMemo(() => indexarMes(mesEfectivo), [mesEfectivo]);

  const hoy = hoyDateKey();
  const [modo, setModo] = useState<Modo>('semana');
  const [diaSeleccionado, setDiaSeleccionado] = useState<DateKey>(
    mesCombinado.dates.includes(hoy) ? hoy : (mesCombinado.dates[0] ?? hoy),
  );
  const [filtros, setFiltros] = useState<FiltrosHorario>({ texto: '', site: 'Todas', role: 'Todos' });
  const [cerrados, setCerrados] = useState<ReadonlySet<string>>(new Set());
  const [personaVista, setPersonaVista] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<{ personaKey: string; date: DateKey } | null>(null);
  const [registroAbierto, setRegistroAbierto] = useState(false);
  const [flash, setFlash] = useState<{ mensaje: string; personKey: string | null; date: DateKey | null } | null>(null);

  function abrirEdicion(personaKey: string, date: DateKey) {
    setPersonaVista(null);
    setEdicion({ personaKey, date });
  }

  async function alGuardar(mensaje: string) {
    const compartible = mensaje.startsWith('Cambio guardado:') ? edicion : null;
    setEdicion(null);
    setFlash({
      mensaje,
      personKey: compartible?.personaKey ?? null,
      date: compartible?.date ?? null,
    });
    await onCambio();
  }

  const personasFiltradas = useMemo(() => filtrarPersonas(mesCombinado.people, filtros), [mesCombinado.people, filtros]);
  const grupos = useMemo(() => agruparPorDepartamento(personasFiltradas), [personasFiltradas]);

  const semana = weekDates(diaSeleccionado);
  const enRangoDeHoy = mesCombinado.dates.includes(hoy);

  function cambiarSemana(delta: -1 | 1) {
    setDiaSeleccionado((d) => addDays(d, 7 * delta));
  }

  function alternarGrupo(department: string) {
    setCerrados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(department)) siguiente.delete(department);
      else siguiente.add(department);
      return siguiente;
    });
  }

  const personaVistaRapida = personaVista === null ? null : indice.personas.get(personaVista) ?? null;

  return (
    <div style={{ maxWidth: 1240 }}>
      <header style={estiloCabecera}>
        <div>
          <p style={estiloEtiqueta}>
            {formatFechaCorta(semana[0] ?? diaSeleccionado)} – {formatFechaCorta(semana[6] ?? diaSeleccionado)}
          </p>
          <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--fuente-titulo)', fontSize: 28, fontWeight: 700 }}>
            Horario completo
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--texto-3)', fontSize: 14 }}>
            Toca una celda para cambiar ese día · toca un nombre para ver su horario.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={() => setRegistroAbierto(true)} style={estiloBotonSecundario}>
            Cambios · {horario.overrides.length}
          </button>
          <Link
            to={`/jefe/compartir?scope=semana&date=${diaSeleccionado}&site=${encodeURIComponent(filtros.site)}&role=${encodeURIComponent(filtros.role)}`}
            style={estiloBotonSecundario}
          >
            Compartir
          </Link>
        </div>
      </header>

      {flash !== null && (
        <div role="status" style={estiloFlash}>
          <span style={{ flex: '1 1 300px' }}>{flash.mensaje}</span>
          {flash.personKey !== null && flash.date !== null && (
            <Link
              to={`/jefe/compartir?scope=cambio&person=${encodeURIComponent(flash.personKey)}&date=${flash.date}`}
              style={estiloBotonEnlaceFlash}
            >
              Compartir este cambio
            </Link>
          )}
          <button type="button" onClick={() => setFlash(null)} style={estiloBotonEnlaceFlash}>
            Cerrar
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div role="group" aria-label="Tipo de vista" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 999, background: 'var(--borde-suave)' }}>
          {(['semana', 'dia'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={modo === m}
              onClick={() => setModo(m)}
              style={{
                minHeight: 36,
                padding: '0 16px',
                border: 'none',
                borderRadius: 999,
                background: modo === m ? 'var(--superficie)' : 'transparent',
                boxShadow: modo === m ? '0 1px 3px rgba(23,26,33,.18)' : 'none',
                font: 'inherit',
                fontSize: 14,
                fontWeight: modo === m ? 600 : 500,
                cursor: 'pointer',
              }}
            >
              {m === 'semana' ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button type="button" aria-label="Semana anterior" onClick={() => cambiarSemana(-1)} style={estiloBotonIcono}>
            ‹
          </button>
          <span style={{ minWidth: 140, textAlign: 'center', fontFamily: 'var(--fuente-mono)', fontSize: 14, fontWeight: 600 }}>
            {formatFechaCorta(semana[0] ?? diaSeleccionado)} – {formatFechaCorta(semana[6] ?? diaSeleccionado)}
          </span>
          <button type="button" aria-label="Semana siguiente" onClick={() => cambiarSemana(1)} style={estiloBotonIcono}>
            ›
          </button>
          {(diaSeleccionado !== hoy || !enRangoDeHoy) && enRangoDeHoy && (
            <button type="button" onClick={() => setDiaSeleccionado(hoy)} style={estiloBotonSecundario}>
              Hoy
            </button>
          )}
        </div>
      </div>

      <section aria-label="Filtros" style={estiloTarjeta}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '2 1 240px' }}>
            <label htmlFor="q" style={estiloLabel}>
              Buscar persona
            </label>
            <input
              id="q"
              type="search"
              placeholder="Nombre"
              value={filtros.texto}
              onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
              style={estiloCampo}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 170px' }}>
            <label htmlFor="ubic" style={estiloLabel}>
              Sede
            </label>
            <select
              id="ubic"
              value={filtros.site}
              onChange={(e) => setFiltros((f) => ({ ...f, site: e.target.value as FiltrosHorario['site'] }))}
              style={estiloCampo}
            >
              <option value="Todas">Todas</option>
              {SEDES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 170px' }}>
            <label htmlFor="rol" style={estiloLabel}>
              Rol
            </label>
            <select
              id="rol"
              value={filtros.role}
              onChange={(e) => setFiltros((f) => ({ ...f, role: e.target.value as FiltrosHorario['role'] }))}
              style={estiloCampo}
            >
              <option value="Todos">Todos</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--texto-3)' }}>
            <Leyenda color={COLOR_CATEGORIA['manana']?.fondo} texto="Mañana / día" />
            <Leyenda color={COLOR_CATEGORIA['tarde']?.fondo} texto="Tarde" />
            <Leyenda color={COLOR_CATEGORIA['noche']?.fondo} texto="Noche (+1)" />
            <Leyenda color={COLOR_CATEGORIA['vacaciones']?.fondo} texto="Vacaciones" />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, outline: '2px dashed var(--cambio-jefatura)', outlineOffset: -2 }} />
              Cambiado por jefatura
            </span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--texto-2)', fontWeight: 500 }}>
            {modo === 'semana'
              ? `${personasFiltradas.length} ${personasFiltradas.length === 1 ? 'persona' : 'personas'} · ${grupos.length} ${grupos.length === 1 ? 'departamento' : 'departamentos'}`
              : resumenDelDia(indice, personasFiltradas, diaSeleccionado)}
          </span>
        </div>
      </section>

      {modo === 'dia' && (
        <div role="group" aria-label="Día" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
          {semana.map((fecha) => (
            <button
              key={fecha}
              type="button"
              className="ss-dia-chip"
              aria-pressed={fecha === diaSeleccionado}
              onClick={() => setDiaSeleccionado(fecha)}
            >
              <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }}>
                {fecha === hoy ? 'Hoy' : nombreDia(fecha).slice(0, 3)}
              </span>
              <span style={{ fontFamily: 'var(--fuente-titulo)', fontSize: 16, fontWeight: 700 }}>{fecha.slice(-2)}</span>
            </button>
          ))}
        </div>
      )}

      <section aria-label="Horario por persona" style={{ ...estiloTarjeta, padding: '8px 12px 16px' }}>
        <div className="ss-horario-scroll">
          {modo === 'semana' ? (
            <VistaSemana
              grupos={grupos}
              indice={indice}
              indiceOverrides={indiceOverrides}
              semana={semana}
              hoy={hoy}
              cerrados={cerrados}
              onToggle={alternarGrupo}
              onAbrirPersona={setPersonaVista}
              onEditar={abrirEdicion}
            />
          ) : (
            <VistaDia
              grupos={grupos}
              indice={indice}
              dia={diaSeleccionado}
              cerrados={cerrados}
              onToggle={alternarGrupo}
              onAbrirPersona={setPersonaVista}
              onEditar={abrirEdicion}
            />
          )}
        </div>
        {grupos.length === 0 && (
          <p style={{ margin: '16px 0 0', padding: 18, textAlign: 'center', color: 'var(--texto-3)', fontSize: 14, border: '1px dashed var(--borde)', borderRadius: 'var(--radio-control)' }}>
            Nadie coincide con estos filtros.
          </p>
        )}
      </section>

      {personaVistaRapida !== null && (
        <VistaRapida
          persona={personaVistaRapida}
          indice={indice}
          semana={semana}
          diaReferencia={semana.includes(diaSeleccionado) ? diaSeleccionado : (semana[0] ?? diaSeleccionado)}
          onCerrar={() => setPersonaVista(null)}
          onEditar={abrirEdicion}
        />
      )}

      {edicion !== null &&
        (() => {
          const persona = indice.personas.get(edicion.personaKey);
          if (persona === undefined) return null;
          const valorOriginal = diaDe(indiceOriginal, edicion.personaKey, edicion.date)?.shift ?? { kind: 'unknown' as const, raw: '' };
          const valorEfectivo = diaDe(indice, edicion.personaKey, edicion.date)?.shift ?? valorOriginal;
          const overrideVigente = buscarOverride(indiceOverrides, edicion.personaKey, edicion.date);
          const mesDelDia = horario.months.find((m) => m.month.slice(0, 7) === edicion.date.slice(0, 7));
          return (
            <PanelEdicion
              persona={persona}
              personaKey={edicion.personaKey}
              date={edicion.date}
              valorOriginal={valorOriginal}
              valorEfectivo={valorEfectivo}
              overrideVigente={overrideVigente}
              indice={indice}
              indiceOverrides={indiceOverrides}
              entriesDelMes={mesDelDia?.entries ?? mesCombinado.entries}
              onGuardado={(mensaje) => void alGuardar(mensaje)}
              onCerrar={() => setEdicion(null)}
            />
          );
        })()}

      {registroAbierto && (
        <RegistroCambios
          overrides={horario.overrides}
          indice={indice}
          indiceOriginal={indiceOriginal}
          onDeshecho={() => void onCambio()}
          onCerrar={() => setRegistroAbierto(false)}
        />
      )}
    </div>
  );
}

function resumenDelDia(indice: IndiceMes, personas: readonly SheetPerson[], dia: DateKey): string {
  let enTurno = 0;
  let libres = 0;
  let vacaciones = 0;
  for (const p of personas) {
    const entry = diaDe(indice, p.key, dia);
    if (entry === null) continue;
    if (entry.shift.kind === 'work') enTurno++;
    else if (entry.shift.kind === 'off') libres++;
    else if (entry.shift.kind === 'vacation') vacaciones++;
  }
  return `${formatFechaCorta(dia)}: ${enTurno} en turno · ${libres} libres · ${vacaciones} vacaciones`;
}

function Leyenda({ color, texto }: { color: string | undefined; texto: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color }} />
      {texto}
    </span>
  );
}

function GrupoCabecera({
  department,
  role,
  site,
  area,
  resumen,
  abierto,
  onToggle,
}: {
  department: string;
  role: Role;
  site: string;
  area: string | null;
  resumen: string;
  abierto: boolean;
  onToggle: () => void;
}) {
  const c = COLOR_ROL[role];
  return (
    <button
      type="button"
      className="ss-grupo-cabecera"
      style={{ borderLeft: `5px solid ${c.borde}` }}
      aria-expanded={abierto}
      onClick={onToggle}
    >
      <span className={`ss-grupo-chevron${abierto ? '' : ' cerrado'}`} aria-hidden>
        ▾
      </span>
      <span style={{ fontFamily: 'var(--fuente-titulo)', fontSize: 15, fontWeight: 700 }}>{department}</span>
      <span style={estiloEtiquetaRol(role)}>{role}</span>
      <span style={estiloEtiquetaSede(site !== 'Sin sede')}>{site.toUpperCase()}</span>
      {area !== null && <span style={estiloEtiquetaArea}>{area}</span>}
      <span style={{ fontSize: 13, color: 'var(--texto-3)', marginLeft: 'auto' }}>{resumen}</span>
    </button>
  );
}

function VistaSemana({
  grupos,
  indice,
  indiceOverrides,
  semana,
  hoy,
  cerrados,
  onToggle,
  onAbrirPersona,
  onEditar,
}: {
  grupos: readonly ReturnType<typeof agruparPorDepartamento>[number][];
  indice: IndiceMes;
  indiceOverrides: ReadonlyMap<string, DayOverride>;
  semana: readonly DateKey[];
  hoy: DateKey;
  cerrados: ReadonlySet<string>;
  onToggle: (department: string) => void;
  onAbrirPersona: (key: string) => void;
  onEditar: (personaKey: string, date: DateKey) => void;
}) {
  return (
    <div className="ss-horario-tabla">
      <div className="ss-fila-horario cabecera">
        <span className="ss-nombre-col" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--texto-3)', fontWeight: 600 }}>
          Persona
        </span>
        {semana.map((fecha) => (
          <span key={fecha} className={`ss-celda-dia${fecha === hoy ? ' hoy' : ''}`} style={{ flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
            <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: fecha === hoy ? 'var(--cambio-jefatura)' : 'var(--texto-3)', fontWeight: 700 }}>
              {fecha === hoy ? 'Hoy' : nombreDia(fecha).slice(0, 3)}
            </span>
            <span style={{ fontFamily: 'var(--fuente-titulo)', fontSize: 16, fontWeight: 700 }}>{fecha.slice(-2)}</span>
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--texto-3)', fontWeight: 600 }}>
          Semana
        </span>
      </div>

      {grupos.map((g) => {
        const abierto = !cerrados.has(g.department);
        const resumen = `${g.personas.length === 1 ? '1 persona' : `${g.personas.length} personas`} · ${contarEnTurno(indice, g.personas, hoy)} en turno hoy`;
        return (
          <div key={g.department}>
            <GrupoCabecera
              department={g.department}
              role={g.role}
              site={g.site}
              area={g.area}
              resumen={resumen}
              abierto={abierto}
              onToggle={() => onToggle(g.department)}
            />
            {abierto &&
              g.personas.map((p, i) => {
                const resumenSemana = resumirSemana(indice, p.key, semana);
                return (
                  <div key={p.key} className={`ss-fila-horario${i % 2 ? ' alterna' : ''}`}>
                    <span className="ss-nombre-col">
                      <button type="button" onClick={() => onAbrirPersona(p.key)} style={estiloBotonNombre}>
                        {p.displayName}
                      </button>
                    </span>
                    {semana.map((fecha) => {
                      const entry = diaDe(indice, p.key, fecha);
                      const cambiada = tieneCambio(indiceOverrides, p.key, fecha);
                      const t = textoTurno(entry?.shift);
                      const cat = entry !== undefined && entry !== null ? shiftCategory(entry.shift) : null;
                      const colores = cat !== null ? COLOR_CATEGORIA[cat] : undefined;
                      const override = buscarOverride(indiceOverrides, p.key, fecha);
                      return (
                        <span key={fecha} className={`ss-celda-dia${fecha === hoy ? ' hoy' : ''}`}>
                          <button
                            type="button"
                            disabled={entry === null}
                            onClick={() => onEditar(p.key, fecha)}
                            aria-label={`Cambiar ${p.displayName}, ${formatFechaCorta(fecha)}`}
                            className={`ss-celda-turno${entry === null ? ' vacia' : ''}${cambiada ? ' cambiada' : ''}`}
                            style={{
                              border: 'none',
                              padding: 0,
                              font: 'inherit',
                              cursor: entry === null ? 'default' : 'pointer',
                              ...(colores !== undefined ? { background: colores.fondo, color: colores.texto } : undefined),
                            }}
                          >
                            <span className="a">{t.a}</span>
                            {t.b !== '' && <span className="b">{t.b}</span>}
                            {override?.site !== null && override?.site !== undefined && <span className="s">{override.site}</span>}
                          </button>
                        </span>
                      );
                    })}
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', padding: '0 10px', fontFamily: 'var(--fuente-mono)' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{formatDuration(resumenSemana.minutos)}</span>
                      <span style={{ fontSize: 11, color: 'var(--texto-3)' }}>
                        {resumenSemana.turnos} {resumenSemana.turnos === 1 ? 'turno' : 'turnos'}
                      </span>
                    </span>
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

function VistaDia({
  grupos,
  indice,
  dia,
  cerrados,
  onToggle,
  onAbrirPersona,
  onEditar,
}: {
  grupos: readonly ReturnType<typeof agruparPorDepartamento>[number][];
  indice: IndiceMes;
  dia: DateKey;
  cerrados: ReadonlySet<string>;
  onToggle: (department: string) => void;
  onAbrirPersona: (key: string) => void;
  onEditar: (personaKey: string, date: DateKey) => void;
}) {
  const ayer = addDays(dia, -1);

  return (
    <div className="ss-horario-dia">
      <div className="ss-fila-dia" style={{ borderBottom: '1px solid var(--borde)' }}>
        <span className="ss-nombre-col" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--texto-3)', fontWeight: 600 }}>
          {nombreDia(dia)} {dia.slice(-2)}
        </span>
        <span style={{ display: 'flex', justifyContent: 'space-between', margin: '0 12px', fontFamily: 'var(--fuente-mono)', fontSize: 11, color: 'var(--texto-3)' }}>
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </span>
        <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--texto-3)', fontWeight: 600, textAlign: 'right', paddingRight: 10 }}>
          Horario
        </span>
        <span />
      </div>

      {grupos.map((g) => {
        const abierto = !cerrados.has(g.department);
        const trabajando: { persona: SheetPerson; shift: ShiftValue; shiftAyer: ShiftValue | null }[] = [];
        const libres: string[] = [];
        const vacaciones: string[] = [];
        for (const p of g.personas) {
          const entry = diaDe(indice, p.key, dia);
          const entryAyer = diaDe(indice, p.key, ayer);
          const shiftAyer = entryAyer?.shift ?? null;
          const tienePrevia = shiftAyer !== null && barraDeAyer(shiftAyer) !== null;
          if (entry?.shift.kind === 'work' || tienePrevia) {
            trabajando.push({ persona: p, shift: entry?.shift ?? { kind: 'unknown', raw: '' }, shiftAyer });
          } else if (entry?.shift.kind === 'vacation') vacaciones.push(p.displayName);
          else if (entry?.shift.kind === 'off') libres.push(p.displayName);
        }
        trabajando.sort((a, b) => {
          const sa = a.shift.kind === 'work' ? a.shift.startMin : -1;
          const sb = b.shift.kind === 'work' ? b.shift.startMin : -1;
          return sa - sb || a.persona.displayName.localeCompare(b.persona.displayName, 'es');
        });
        const partes: string[] = [];
        if (libres.length > 0) partes.push(`Libres: ${libres.join(', ')}`);
        if (vacaciones.length > 0) partes.push(`Vacaciones: ${vacaciones.join(', ')}`);
        const nTurno = trabajando.filter((x) => x.shift.kind === 'work').length;
        const resumen = `${nTurno} en turno · ${libres.length} libres${vacaciones.length > 0 ? ` · ${vacaciones.length} vacaciones` : ''}`;

        return (
          <div key={g.department}>
            <GrupoCabecera
              department={g.department}
              role={g.role}
              site={g.site}
              area={g.area}
              resumen={resumen}
              abierto={abierto}
              onToggle={() => onToggle(g.department)}
            />
            {abierto && (
              <>
                {trabajando.map((x, i) => {
                  const barra = x.shift.kind === 'work' ? barraDeHoy(x.shift) : null;
                  const previa = x.shiftAyer !== null ? barraDeAyer(x.shiftAyer) : null;
                  const cat = x.shift.kind === 'work' ? shiftCategory(x.shift) : null;
                  const colores = cat !== null ? COLOR_CATEGORIA[cat] : undefined;
                  const catAyer = x.shiftAyer !== null ? shiftCategory(x.shiftAyer) : null;
                  const coloresAyer = catAyer !== null ? COLOR_CATEGORIA[catAyer] : undefined;
                  const texto =
                    x.shift.kind === 'work'
                      ? `${formatMinutes(x.shift.startMin)}–${formatMinutes(x.shift.endMin % 1440)}${endsNextDay(x.shift) ? ' +1' : ''}`
                      : previa !== null && x.shiftAyer?.kind === 'work'
                        ? `hasta ${formatMinutes(x.shiftAyer.endMin % 1440)} (de ayer)`
                        : '';
                  return (
                    <div key={x.persona.key} className={`ss-fila-dia${i % 2 ? ' alterna' : ''}`}>
                      <span className="ss-nombre-col">
                        <button type="button" onClick={() => onAbrirPersona(x.persona.key)} style={estiloBotonNombre}>
                          {x.persona.displayName}
                        </button>
                      </span>
                      <span className="ss-track">
                        {previa !== null && (
                          <span
                            className="ss-barra previa"
                            style={{ left: `${previa.leftPct}%`, width: `${previa.widthPct}%`, color: coloresAyer?.texto ?? 'var(--apagado)' }}
                          />
                        )}
                        {barra !== null && (
                          <span className="ss-barra" style={{ left: `${barra.leftPct}%`, width: `${barra.widthPct}%`, background: colores?.fondo }} />
                        )}
                      </span>
                      <span style={{ fontFamily: 'var(--fuente-mono)', fontSize: 13, fontWeight: 500, textAlign: 'right', paddingRight: 10 }}>{texto}</span>
                      <span style={{ textAlign: 'right', paddingRight: 8 }}>
                        <button type="button" onClick={() => onEditar(x.persona.key, dia)} style={estiloBotonEnlace}>
                          Editar
                        </button>
                      </span>
                    </div>
                  );
                })}
                {partes.length > 0 && (
                  <p style={{ margin: 0, padding: '10px 10px 10px 30px', fontSize: 13, color: 'var(--texto-3)', borderBottom: '1px solid var(--borde-suave-2)' }}>
                    {partes.join(' · ')}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VistaRapida({
  persona,
  indice,
  semana,
  diaReferencia,
  onCerrar,
  onEditar,
}: {
  persona: SheetPerson;
  indice: IndiceMes;
  semana: readonly DateKey[];
  diaReferencia: DateKey;
  onCerrar: () => void;
  onEditar: (personaKey: string, date: DateKey) => void;
}) {
  const resumen = resumirSemana(indice, persona.key, semana);
  return (
    <>
      <div aria-hidden style={estiloFondoDialogo} onClick={onCerrar} />
      <aside role="dialog" aria-modal="true" aria-label="Horario de la persona" style={estiloPanel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <p style={estiloEtiqueta}>{persona.department}</p>
            <p style={{ margin: '6px 0 0', fontFamily: 'var(--fuente-titulo)', fontSize: 20, fontWeight: 700 }}>{persona.displayName}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              <span style={estiloEtiquetaRol(persona.role)}>{persona.role}</span>
              <span style={estiloEtiquetaSede(persona.site !== 'Sin sede')}>{persona.site.toUpperCase()}</span>
            </div>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} style={estiloBotonIcono}>
            ×
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
          {semana.map((fecha) => {
            const entry = diaDe(indice, persona.key, fecha);
            const cat = entry !== null ? shiftCategory(entry.shift) : null;
            const colores = cat !== null ? COLOR_CATEGORIA[cat] : undefined;
            const t = textoTurno(entry?.shift);
            return (
              <div
                key={fecha}
                style={{
                  border: `1px solid ${fecha === diaReferencia ? 'var(--primario)' : 'var(--borde-suave)'}`,
                  borderRadius: 'var(--radio-control)',
                  padding: '8px 2px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--texto-3)', fontWeight: 600 }}>
                  {nombreDia(fecha).slice(0, 3)}
                </span>
                <span style={{ fontFamily: 'var(--fuente-titulo)', fontSize: 14, fontWeight: 700 }}>{fecha.slice(-2)}</span>
                <span
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    padding: '4px 1px',
                    fontSize: 10,
                    borderRadius: 6,
                    background: colores?.fondo,
                    color: colores?.texto,
                  }}
                >
                  {t.a}
                  {t.b !== '' && (
                    <>
                      <br />
                      {t.b.replace('→ ', '')}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-2)' }}>
          Semana {formatFechaCorta(semana[0] ?? diaReferencia)}–{formatFechaCorta(semana[6] ?? diaReferencia)}: {resumen.turnos}{' '}
          {resumen.turnos === 1 ? 'turno' : 'turnos'} · {formatDuration(resumen.minutos)}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={() => onEditar(persona.key, diaReferencia)} style={estiloBotonSecundario}>
            Editar {nombreDia(diaReferencia)} {diaReferencia.slice(-2)}
          </button>
          <Link
            to={`/jefe/compartir?scope=persona&person=${encodeURIComponent(persona.key)}&date=${diaReferencia}`}
            style={estiloBotonSecundario}
          >
            Compartir su horario
          </Link>
        </div>
      </aside>
    </>
  );
}

function estiloEtiquetaRol(role: Role): CSSProperties {
  const c = COLOR_ROL[role];
  return {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.07em',
    textTransform: 'uppercase',
    padding: '2px 7px',
    borderRadius: 'var(--radio-etiqueta)',
    background: c.fondo,
    color: c.texto,
    whiteSpace: 'nowrap',
  };
}

function estiloEtiquetaSede(tieneSede: boolean): CSSProperties {
  return {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '.07em',
    textTransform: 'uppercase',
    padding: '2px 7px',
    borderRadius: 'var(--radio-etiqueta)',
    border: `1px solid ${tieneSede ? 'var(--sede-borde)' : 'var(--borde-suave)'}`,
    color: tieneSede ? 'var(--texto-2)' : 'var(--apagado)',
    whiteSpace: 'nowrap',
  };
}

const estiloEtiquetaArea: CSSProperties = {
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.07em',
  textTransform: 'uppercase',
  padding: '2px 7px',
  borderRadius: 'var(--radio-etiqueta)',
  border: '1px solid var(--borde-suave)',
  color: 'var(--texto-2)',
};

const estiloCabecera: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 16,
  marginBottom: 16,
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

const estiloTarjeta: CSSProperties = {
  border: '1px solid var(--borde)',
  borderRadius: 'var(--radio-tarjeta)',
  padding: '14px 18px',
  marginBottom: 16,
  background: 'var(--superficie)',
};

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

const estiloBotonSecundario: CSSProperties = {
  minHeight: 'var(--tactil-min)',
  padding: '0 14px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  color: 'var(--texto)',
  cursor: 'pointer',
  fontSize: 14,
  display: 'inline-flex',
  alignItems: 'center',
  textDecoration: 'none',
};

const estiloBotonNombre: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--texto)',
  background: 'transparent',
  border: 'none',
  padding: '6px 0',
  textAlign: 'left',
  cursor: 'pointer',
  minHeight: 36,
};

const estiloBotonEnlace: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--primario)',
  background: 'transparent',
  border: 'none',
  padding: '0 6px',
  minHeight: 36,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const estiloFlash: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  borderRadius: 'var(--radio-tarjeta)',
  background: 'var(--exito-fondo)',
  color: 'var(--exito-texto)',
  fontSize: 14,
  marginBottom: 16,
};

const estiloBotonEnlaceFlash: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  color: 'inherit',
  background: 'transparent',
  border: 'none',
  padding: 0,
  minHeight: 36,
  cursor: 'pointer',
  textDecoration: 'underline',
};

const estiloFondoDialogo: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(23,26,33,.32)',
  zIndex: 20,
};

const estiloPanel: CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  bottom: 16,
  width: 420,
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
