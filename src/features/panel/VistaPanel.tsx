/**
 * Pantalla del panel de jefatura: métricas del día, conflictos y cobertura.
 * Los textos salen de DashOps.dc.html. Ficha: docs/features/panel.md.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarConflictos } from '@/domain/conflicts/index.ts';
import type { OpcionConflicto, TarjetaConflicto } from '@/domain/conflicts/types.ts';
import { departamentosDelDia, franjasDelDia, sedesDelDia } from '@/domain/panel.ts';
import { aplicarCambios } from '@/domain/overlay.ts';
import { indexarMes, metricasDelDia } from '@/domain/presence.ts';
import { COLOR_ROL } from '@/ui/colorRol.ts';
import { etiquetaDia } from '@/domain/conflicts/clave.ts';
import { nombreMes } from '@/domain/time.ts';
import type { DateKey, Site } from '@/domain/types.ts';
import type { DatosPanel } from '@/data/panel.ts';
import { aceptarConflicto, deshacerAceptacion, guardarNombreManual } from '@/data/panel.ts';
import { deshacerCambioDia, guardarCambioDia } from '@/data/horario.ts';
import './panel.css';

const ORDEN_SEDES: readonly Site[] = [
  'Megacentro',
  'Tuscania',
  'Phoenix Tower',
  'Santa Ana',
  'San Miguel',
  'Atento',
  'Activo Fijo',
  'Sin sede',
];

const RANGO_FRANJA: Record<string, string> = {
  Mañana: 'antes de las 08:00',
  Día: '08:00–12:00',
  Tarde: '12:00–17:00',
  Noche: 'desde las 17:00',
};

const COLOR_FRANJA: Record<string, string> = {
  Mañana: 'var(--turno-manana-texto)',
  Día: 'var(--turno-manana-texto)',
  Tarde: 'var(--turno-tarde-texto)',
  Noche: 'var(--turno-noche-texto)',
};

type Filtro = 'pend' | 'res' | 'todos';

function hoyLocal(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function capital(texto: string): string {
  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1);
}

export function VistaPanel({ datos, onCambio }: { datos: DatosPanel; onCambio: () => Promise<void> }) {
  const fechas = useMemo(() => {
    const todas = datos.months.filter((mes) => !mes.hidden).flatMap((mes) => [...mes.dates]);
    return [...new Set(todas)].sort();
  }, [datos.months]);

  const [fecha, setFecha] = useState<DateKey>(() => {
    const hoy = hoyLocal();
    if (fechas.includes(hoy)) return hoy;
    const previas = fechas.filter((dia) => dia <= hoy);
    return previas[previas.length - 1] ?? fechas[0] ?? hoy;
  });
  const [filtro, setFiltro] = useState<Filtro>('pend');

  const dia = fechas.includes(fecha) ? fecha : (fechas[0] ?? fecha);
  const indiceFecha = fechas.indexOf(dia);
  const mes = datos.months.find((item) => item.dates.includes(dia)) ?? datos.months[datos.months.length - 1];

  const indice = useMemo(() => {
    if (mes === undefined) return null;
    return indexarMes({ ...mes, entries: aplicarCambios(mes.entries, datos.overrides) });
  }, [mes, datos.overrides]);

  const listas = useMemo(
    () => listarConflictos(datos.months, datos.overrides, datos.acks),
    [datos],
  );

  if (mes === undefined || indice === null) {
    return <p style={{ color: 'var(--texto-2)' }}>Todavía no hay un horario publicado.</p>;
  }

  const metricas = metricasDelDia(indice, dia);
  const franjas = franjasDelDia(indice, dia);
  const maxFranja = Math.max(1, ...franjas.map((franja) => franja.cantidad));
  const sedes = ORDEN_SEDES.map((site) => sedesDelDia(indice, dia).find((sede) => sede.site === site)).filter(
    (sede) => sede !== undefined,
  );
  const departamentos = departamentosDelDia(indice, dia);
  const top = departamentos.slice(0, 10);
  const personas = indice.personas.size;
  const nDepartamentos = new Set([...indice.personas.values()].map((p) => p.department)).size;
  const nSedes = new Set([...indice.personas.values()].map((p) => p.site).filter((s) => s !== 'Sin sede')).size;
  const mesNombre = capital(nombreMes(mes.month));
  const altas = listas.pendientes.filter((t) => t.severidad === 'alta').length;
  const mostradas =
    filtro === 'todos' ? [...listas.pendientes, ...listas.resueltos] : filtro === 'res' ? listas.resueltos : listas.pendientes;

  return (
    <div className="ss-panel">
      <header style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <p className="ss-eyebrow" style={{ margin: 0 }}>Hoja {mesNombre}</p>
          <h1>Panel de operación</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--texto-3)', fontSize: 14 }}>
            {personas} personas · {nDepartamentos} departamentos · {nSedes} sedes
          </p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="ss-btn-o" aria-label="Día anterior" disabled={indiceFecha <= 0} onClick={() => setFecha(fechas[indiceFecha - 1] ?? dia)} style={{ width: 44, padding: 0, justifyContent: 'center' }}>
            ‹
          </button>
          <span style={{ minWidth: 160, textAlign: 'center', fontFamily: 'var(--fuente-mono)', fontSize: 14, fontWeight: 600 }}>
            {etiquetaDia(dia)}
            {dia === hoyLocal() ? ' · hoy' : ''}
          </span>
          <button type="button" className="ss-btn-o" aria-label="Día siguiente" disabled={indiceFecha < 0 || indiceFecha >= fechas.length - 1} onClick={() => setFecha(fechas[indiceFecha + 1] ?? dia)} style={{ width: 44, padding: 0, justifyContent: 'center' }}>
            ›
          </button>
        </div>
      </header>

      <div className="ss-metricas">
        <div className="ss-metric" style={{ borderLeft: '4px solid var(--primario)' }}>
          <p className="ss-eyebrow" style={{ margin: 0 }}>En turno</p>
          <b>
            {metricas.enTurno}{' '}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--texto-3)' }}>de {metricas.total}</span>
          </b>
        </div>
        <Metrica etiqueta="Libres" valor={metricas.libres} />
        <Metrica etiqueta="Vacaciones" valor={metricas.vacaciones} />
        <Metrica etiqueta="Cruzan medianoche" valor={metricas.cruzanMedianoche} />
      </div>

      <section className="ss-card" aria-label="Conflictos" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontFamily: 'var(--fuente-titulo)', fontSize: 20, fontWeight: 700 }}>Conflictos en la hoja</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--texto-3)' }}>
              {listas.pendientes.length === 0
                ? 'Todo resuelto · la hoja está lista para la operación'
                : `${listas.pendientes.length} ${listas.pendientes.length === 1 ? 'pendiente' : 'pendientes'} · ${altas} de prioridad alta · ${listas.resueltos.length} ${listas.resueltos.length === 1 ? 'resuelto' : 'resueltos'}`}
            </p>
          </div>
          <div role="group" aria-label="Mostrar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <FiltroBoton actual={filtro} id="pend" onPick={setFiltro} etiqueta={`Pendientes · ${listas.pendientes.length}`} />
            <FiltroBoton actual={filtro} id="res" onPick={setFiltro} etiqueta={`Resueltos · ${listas.resueltos.length}`} />
            <FiltroBoton actual={filtro} id="todos" onPick={setFiltro} etiqueta={`Todos · ${listas.pendientes.length + listas.resueltos.length}`} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mostradas.map((tarjeta) => (
            <Tarjeta key={tarjeta.key} tarjeta={tarjeta} onCambio={onCambio} />
          ))}
          {mostradas.length === 0 && (
            <p style={{ margin: 0, padding: 18, textAlign: 'center', color: 'var(--texto-3)', fontSize: 14, border: '1px dashed var(--borde)', borderRadius: 12 }}>
              {filtro === 'res' ? 'Todavía no resuelves ningún conflicto.' : 'No hay conflictos pendientes.'}
            </p>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--texto-3)' }}>
          Las correcciones se guardan como cambios de jefatura y se ven en el horario de cada persona. La hoja original no se modifica.
        </p>
      </section>

      <div className="ss-fila-cobertura">
        <section className="ss-card" aria-label="Cobertura" style={{ flex: '2 1 420px' }}>
          <p className="ss-eyebrow" style={{ margin: '0 0 14px' }}>Cobertura · {etiquetaDia(dia)} · según hora de entrada</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {franjas.map((franja) => (
              <div key={franja.banda} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(0, 3fr) 40px', gap: 14, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{franja.banda}</div>
                  <div style={{ fontFamily: 'var(--fuente-mono)', fontSize: 11, color: 'var(--texto-3)' }}>{RANGO_FRANJA[franja.banda]}</div>
                </div>
                <div className="ss-barra">
                  <div style={{ width: `${Math.round((franja.cantidad / maxFranja) * 100)}%`, background: COLOR_FRANJA[franja.banda] }} />
                </div>
                <div style={{ fontFamily: 'var(--fuente-mono)', fontSize: 15, fontWeight: 600, textAlign: 'right' }}>{franja.cantidad}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="ss-card" aria-label="Por sede" style={{ flex: '1 1 320px' }}>
          <p className="ss-eyebrow" style={{ margin: '0 0 10px' }}>En turno · por sede</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sedes.map((sede) => (
              <div key={sede.site} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1.3fr) minmax(0, 2fr) 52px', gap: 12, alignItems: 'center' }}>
                <span className="ss-tag" style={{ border: '1px solid var(--borde)', color: 'var(--texto-2)' }}>{sede.site}</span>
                <div className="ss-barra" style={{ height: 10 }}>
                  <div style={{ width: `${sede.total === 0 ? 0 : Math.round((sede.enTurno / sede.total) * 100)}%`, background: '#2f5fb3' }} />
                </div>
                <span style={{ fontFamily: 'var(--fuente-mono)', fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{sede.enTurno}/{sede.total}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="ss-card" aria-label="Departamentos">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
          <p className="ss-eyebrow" style={{ margin: 0 }}>Departamentos · los 10 más grandes · {etiquetaDia(dia)}</p>
          <Link to="/jefe/horario" style={{ fontSize: 13, fontWeight: 500 }}>Ver los {departamentos.length} →</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 680 }}>
            <div className="ss-dep-fila" style={{ borderBottom: '1px solid var(--borde)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--texto-3)', fontWeight: 600, minHeight: 32 }}>
              <span>Departamento</span>
              <span style={{ textAlign: 'right' }}>En turno</span>
              <span style={{ textAlign: 'right' }}>Libres</span>
              <span style={{ textAlign: 'right' }}>Vacac.</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span>Hoy</span>
            </div>
            {top.map((dep) => {
              const color = COLOR_ROL[dep.role];
              return (
                <div key={dep.department} className="ss-dep-fila">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 0' }}>
                    <span style={{ fontWeight: 500 }}>{dep.department}</span>
                    <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span className="ss-tag" style={{ background: color.fondo, color: color.texto }}>{dep.role}</span>
                      <span className="ss-tag" style={{ border: '1px solid var(--borde)', color: 'var(--texto-2)' }}>{dep.site}</span>
                    </span>
                  </div>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--fuente-mono)', fontWeight: 600 }}>{dep.enTurno}</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--fuente-mono)', color: 'var(--texto-3)' }}>{dep.libres}</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--fuente-mono)', color: 'var(--texto-3)' }}>{dep.vacaciones}</span>
                  <span style={{ textAlign: 'right', fontFamily: 'var(--fuente-mono)', color: 'var(--texto-3)' }}>{dep.total}</span>
                  <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--borde-suave-2)' }}>
                    <div style={{ width: `${dep.total === 0 ? 0 : Math.round((dep.enTurno / dep.total) * 100)}%`, background: 'var(--primario)' }} />
                    <div style={{ width: `${dep.total === 0 ? 0 : Math.round((dep.vacaciones / dep.total) * 100)}%`, background: 'var(--turno-vacaciones-texto)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="ss-metric">
      <p className="ss-eyebrow" style={{ margin: 0 }}>{etiqueta}</p>
      <b>{valor}</b>
    </div>
  );
}

function FiltroBoton({ actual, id, etiqueta, onPick }: { actual: Filtro; id: Filtro; etiqueta: string; onPick: (id: Filtro) => void }) {
  return (
    <button type="button" className="ss-seg" aria-pressed={actual === id} onClick={() => onPick(id)}>
      {etiqueta}
    </button>
  );
}

function Tarjeta({ tarjeta, onCambio }: { tarjeta: TarjetaConflicto; onCambio: () => Promise<void> }) {
  const [abierta, setAbierta] = useState(false);
  const [opcionId, setOpcionId] = useState<string | null>(null);
  const [nota, setNota] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const opcion = tarjeta.opciones.find((item) => item.id === opcionId) ?? null;
  const esAceptar = tarjeta.etiquetaAccion.startsWith('Aceptar');
  const sev = tarjeta.estado === 'resuelto' ? 'resuelto' : tarjeta.severidad;

  async function correr(accion: () => Promise<void>) {
    setOcupado(true);
    setError(null);
    try {
      await accion();
      await onCambio();
    } catch {
      setError('No se pudo guardar. Vuelve a intentarlo.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className={abierta ? 'ss-cbox open' : 'ss-cbox'}>
      <button type="button" className="ss-crow" aria-expanded={abierta} onClick={() => setAbierta((v) => !v)}>
        <span className="ss-tag" style={{ background: `var(--sev-${sev}-fondo)`, color: `var(--sev-${sev}-texto)` }}>
          {tarjeta.estado === 'resuelto' ? 'Resuelto' : capital(tarjeta.severidad)}
        </span>
        <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>{tarjeta.titulo}</span>
          <span style={{ fontSize: 13, color: 'var(--texto-3)' }}>{tarjeta.resumen}</span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--texto-3)', whiteSpace: 'nowrap' }}>{tarjeta.tipo}</span>
        <span aria-hidden="true" style={{ transform: abierta ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>
      {abierta && (
        <div style={{ padding: '4px 8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--texto-2)', lineHeight: 1.5 }}>{tarjeta.detalle}</p>
          {tarjeta.estado === 'resuelto' ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--exito-fondo)', color: 'var(--exito-texto)', fontSize: 13 }}>
              <span style={{ flex: '1 1 240px' }}>
                {tarjeta.via === 'cambio' ? 'Cobertura asignada.' : 'Aceptado como está.'}
                {tarjeta.nota ? ` Nota: ${tarjeta.nota}` : ''}
              </span>
              <button type="button" className="ss-btn-o" disabled={ocupado} onClick={() => void correr(() => deshacer(tarjeta))}>
                Deshacer
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tarjeta.opciones.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {tarjeta.opciones.some((item) => item.asignacion !== null)
                      ? `Quién cubre (están libres)`
                      : 'Elige una opción'}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {tarjeta.opciones.map((item) => (
                      <button key={item.id} type="button" className="ss-pick" aria-pressed={opcionId === item.id} onClick={() => setOpcionId(item.id)}>
                        {item.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--texto-3)' }}>
                Nota (opcional)
                <input className="ss-btn-o" style={{ fontWeight: 400, textAlign: 'left' }} placeholder="Por qué se resuelve así" value={nota} onChange={(e) => setNota(e.target.value)} />
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {tarjeta.etiquetaAccion !== '' && !esAceptar && (
                  <button type="button" className="ss-btn" disabled={ocupado || (tarjeta.exigeOpcion && opcion === null)} onClick={() => void correr(() => aplicar(tarjeta, opcion, nota))}>
                    {tarjeta.etiquetaAccion}
                  </button>
                )}
                <button type="button" className={esAceptar ? 'ss-btn' : 'ss-btn-o'} disabled={ocupado} onClick={() => void correr(() => aceptar(tarjeta, nota))}>
                  {esAceptar ? tarjeta.etiquetaAccion : 'Aceptar como está'}
                </button>
                {tarjeta.enlace && (
                  <Link className="ss-btn-o" to="/jefe/horario">Ver en horario completo</Link>
                )}
              </div>
            </div>
          )}
          {error !== null && <p style={{ margin: 0, color: 'var(--peligro)', fontSize: 13 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}

async function aceptar(tarjeta: TarjetaConflicto, nota: string): Promise<void> {
  const texto = nota.trim() === '' ? null : nota.trim();
  for (const clave of tarjeta.claves) await aceptarConflicto(clave, texto);
}

async function aplicar(tarjeta: TarjetaConflicto, opcion: OpcionConflicto | null, nota: string): Promise<void> {
  if (opcion?.asignacion) {
    const asignacion = opcion.asignacion;
    await guardarCambioDia({
      personKey: asignacion.personKey,
      date: asignacion.date,
      kind: 'work',
      startMin: asignacion.startMin,
      endMin: asignacion.endMin,
      site: asignacion.site,
      reason: asignacion.reason,
      note: nota.trim() === '' ? null : nota.trim(),
      supportPersonKey: null,
      conflictKey: tarjeta.key,
    });
    return;
  }
  if (opcion?.nombreManual) {
    await guardarNombreManual(opcion.nombreManual.personKey, opcion.nombreManual.displayName);
    return;
  }
  if (tarjeta.archivar) {
    await deshacerCambioDia(tarjeta.archivar.personKey, tarjeta.archivar.date);
  }
}

async function deshacer(tarjeta: TarjetaConflicto): Promise<void> {
  if (tarjeta.deshacerCambio) {
    await deshacerCambioDia(tarjeta.deshacerCambio.personKey, tarjeta.deshacerCambio.date);
    return;
  }
  for (const clave of tarjeta.claves) await deshacerAceptacion(clave);
}
