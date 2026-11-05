/**
 * Pantalla de jefatura para crear y administrar enlaces por operación,
 * semana, día, persona o cambio. Plan §7.6.
 * Ficha: docs/features/compartir.md.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { obtenerHorarioCompleto, type HorarioCompleto } from '@/data/horario.ts';
import {
  crearEnlace,
  listarEnlacesActivos,
  revocarEnlace,
  type EnlaceActivo,
} from '@/data/shareLinks.ts';
import { ROLES, SEDES } from '@/domain/catalog.ts';
import { filtrarPersonas } from '@/domain/grid.ts';
import { combinarMeses } from '@/domain/presence.ts';
import {
  ETIQUETA_SCOPE,
  type ShareLinkDraft,
  type ShareScope,
  type Vencimiento,
} from '@/domain/share.ts';
import { formatFechaCorta, startOfWeek } from '@/domain/time.ts';
import type { DateKey, Role, Site } from '@/domain/types.ts';
import './compartir.css';

const SCOPES: readonly ShareScope[] = ['operacion', 'semana', 'dia', 'persona', 'cambio'];

function urlDe(slug: string): string {
  return `${window.location.origin}/s/${slug}`;
}

export function Compartir() {
  const [searchParams] = useSearchParams();
  const [horario, setHorario] = useState<HorarioCompleto | null>(null);
  const [enlaces, setEnlaces] = useState<EnlaceActivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scopeInicial = SCOPES.includes(searchParams.get('scope') as ShareScope)
    ? (searchParams.get('scope') as ShareScope)
    : 'operacion';
  const [scope, setScope] = useState<ShareScope>(scopeInicial);
  const [vencimiento, setVencimiento] = useState<Vencimiento>('7d');
  const [fecha, setFecha] = useState<DateKey>(searchParams.get('date') ?? '');
  const [personaKey, setPersonaKey] = useState(searchParams.get('person') ?? '');
  const [site, setSite] = useState<Site | 'Todas'>((searchParams.get('site') as Site | null) ?? 'Todas');
  const [role, setRole] = useState<Role | 'Todos'>((searchParams.get('role') as Role | null) ?? 'Todos');
  const [creado, setCreado] = useState<EnlaceActivo | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    Promise.all([obtenerHorarioCompleto(), listarEnlacesActivos()])
      .then(([nuevoHorario, nuevosEnlaces]) => {
        if (!vigente) return;
        setHorario(nuevoHorario);
        setEnlaces(nuevosEnlaces);
        const combinado = combinarMeses(nuevoHorario.months);
        const primeraFecha = searchParams.get('date') ?? combinado.dates[0] ?? '';
        setFecha(primeraFecha);
        const solicitada = searchParams.get('person');
        setPersonaKey(
          solicitada !== null && combinado.people.some((p) => p.key === solicitada)
            ? solicitada
            : (combinado.people[0]?.key ?? ''),
        );
        setCargando(false);
      })
      .catch(() => {
        if (vigente) {
          setError('No se pudo cargar Compartir. Vuelve a intentarlo.');
          setCargando(false);
        }
      });
    return () => {
      vigente = false;
    };
  }, [searchParams]);

  const combinado = useMemo(() => combinarMeses(horario?.months ?? []), [horario]);
  const personasFiltradas = useMemo(
    () => filtrarPersonas(combinado.people, { texto: '', site, role }),
    [combinado.people, site, role],
  );
  const persona = combinado.people.find((p) => p.key === personaKey) ?? null;
  const fechaValida = fecha !== '' && combinado.dates.includes(fecha);
  const necesitaPersona = scope === 'persona' || scope === 'cambio';
  const necesitaFecha = scope === 'semana' || scope === 'dia' || scope === 'cambio';
  const noValido =
    (necesitaPersona && persona === null)
    || (necesitaFecha && !fechaValida)
    || (scope === 'semana' && personasFiltradas.length === 0);

  function draftActual(): ShareLinkDraft {
    switch (scope) {
      case 'operacion':
        return { scope, params: {}, title: 'Horario de la operación' };
      case 'semana': {
        const lunes = startOfWeek(fecha);
        return {
          scope,
          params: {
            start_date: lunes,
            person_keys: personasFiltradas.map((p) => p.key),
            site,
            role,
          },
          title: `Semana del ${formatFechaCorta(lunes)}${site !== 'Todas' ? ` · ${site}` : ''}${role !== 'Todos' ? ` · ${role}` : ''}`,
        };
      }
      case 'dia':
        return { scope, params: { date: fecha }, title: `Horario del ${formatFechaCorta(fecha)}` };
      case 'persona':
        return { scope, params: { person_key: personaKey }, title: `Horario de ${persona?.displayName ?? ''}` };
      case 'cambio':
        return {
          scope,
          params: { person_key: personaKey, date: fecha },
          title: `Cambio de ${persona?.displayName ?? ''} · ${formatFechaCorta(fecha)}`,
        };
    }
  }

  async function crear() {
    if (noValido) return;
    setGuardando(true);
    setError(null);
    try {
      const enlace = await crearEnlace(draftActual(), vencimiento);
      setCreado(enlace);
      setEnlaces((actuales) => [enlace, ...actuales]);
    } catch {
      setError('No se pudo crear el enlace. Vuelve a intentarlo.');
    } finally {
      setGuardando(false);
    }
  }

  async function revocar(slug: string) {
    try {
      await revocarEnlace(slug);
      setEnlaces((actuales) => actuales.filter((e) => e.slug !== slug));
      if (creado?.slug === slug) setCreado(null);
    } catch {
      setError('No se pudo revocar el enlace. Vuelve a intentarlo.');
    }
  }

  if (cargando) return <p style={{ color: 'var(--texto-2)' }}>Cargando…</p>;
  if (horario === null) return <p style={{ color: 'var(--peligro)' }}>{error}</p>;

  return (
    <div className="ss-share">
      <header>
        <p className="ss-share-kicker">Enlaces de solo lectura</p>
        <h1>Compartir horario</h1>
        <p className="ss-share-help">Elige exactamente qué verá la persona que abra el enlace.</p>
      </header>

      <section className="ss-share-card">
        <h2>Qué compartir</h2>
        <div className="ss-share-scopes" role="radiogroup" aria-label="Qué compartir">
          {SCOPES.map((item) => (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={scope === item}
              className={scope === item ? 'is-selected' : ''}
              onClick={() => {
                setScope(item);
                setCreado(null);
              }}
            >
              {ETIQUETA_SCOPE[item]}
            </button>
          ))}
        </div>

        {necesitaFecha && (
          <label className="ss-share-field">
            {scope === 'semana' ? 'Una fecha de la semana' : 'Día'}
            <select value={fecha} onChange={(e) => setFecha(e.target.value)}>
              {combinado.dates.map((date) => (
                <option key={date} value={date}>{formatFechaCorta(date)}</option>
              ))}
            </select>
          </label>
        )}

        {scope === 'semana' && (
          <div className="ss-share-row">
            <label className="ss-share-field">
              Sede
              <select value={site} onChange={(e) => setSite(e.target.value as Site | 'Todas')}>
                <option value="Todas">Todas</option>
                {SEDES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="ss-share-field">
              Rol
              <select value={role} onChange={(e) => setRole(e.target.value as Role | 'Todos')}>
                <option value="Todos">Todos</option>
                {ROLES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <span className="ss-share-count">{personasFiltradas.length} personas</span>
          </div>
        )}

        {necesitaPersona && (
          <label className="ss-share-field">
            Persona
            <select value={personaKey} onChange={(e) => setPersonaKey(e.target.value)}>
              {combinado.people.map((item) => (
                <option key={item.key} value={item.key}>{item.displayName}</option>
              ))}
            </select>
          </label>
        )}

        <h2>Vence</h2>
        <div className="ss-share-expiry" role="radiogroup" aria-label="Vencimiento">
          {([
            ['24h', '24 horas'],
            ['7d', '7 días'],
            ['fin-de-mes', 'Fin de mes'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={vencimiento === value}
              className={vencimiento === value ? 'is-selected' : ''}
              onClick={() => setVencimiento(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="ss-share-disabled">
          <input type="checkbox" disabled /> Requerir correo de la empresa <span>Próximamente</span>
        </label>

        <button className="ss-share-primary" type="button" disabled={noValido || guardando} onClick={() => void crear()}>
          {guardando ? 'Creando…' : 'Crear enlace'}
        </button>
        {error !== null && <p className="ss-share-error">{error}</p>}
      </section>

      {creado !== null && <EnlaceCreado enlace={creado} />}

      <section className="ss-share-card">
        <h2>Enlaces activos</h2>
        {enlaces.length === 0 ? (
          <p className="ss-share-empty">Todavía no hay enlaces activos.</p>
        ) : (
          <div className="ss-share-list">
            {enlaces.map((enlace) => (
              <article key={enlace.slug}>
                <div>
                  <strong>{enlace.title}</strong>
                  <code>{urlDe(enlace.slug)}</code>
                  <span>Vence {new Date(enlace.expiresAt).toLocaleString('es-SV')}</span>
                </div>
                <button type="button" onClick={() => void revocar(enlace.slug)}>Revocar</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EnlaceCreado({ enlace }: { enlace: EnlaceActivo }) {
  const campoRef = useRef<HTMLInputElement>(null);
  const [copiado, setCopiado] = useState(false);
  const url = urlDe(enlace.slug);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      campoRef.current?.select();
    }
  }

  return (
    <section className="ss-share-card ss-share-result" aria-live="polite">
      <h2>Enlace</h2>
      <div className="ss-share-copy">
        <input ref={campoRef} readOnly value={url} />
        <button type="button" onClick={() => void copiar()}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
      </div>
      <a href={url} target="_blank" rel="noreferrer">Ver cómo lo verá quien lo abra</a>
    </section>
  );
}
