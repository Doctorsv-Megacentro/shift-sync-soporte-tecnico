/**
 * Configura los cinco alcances, slugs y vencimientos de los enlaces de solo
 * lectura. Fase 7, plan §7.6. Ficha: docs/features/compartir.md.
 */

import type { DateKey, Role, Site } from './types.ts';

/** Los cinco alcances del modelo (coincide con el check de `share_links`). */
export type ShareScope = 'operacion' | 'semana' | 'dia' | 'persona' | 'cambio';

export interface ShareParams {
  readonly start_date?: DateKey;
  readonly date?: DateKey;
  readonly person_key?: string;
  readonly person_keys?: readonly string[];
  readonly site?: Site | 'Todas';
  readonly role?: Role | 'Todos';
}

export interface ShareLinkDraft {
  readonly scope: ShareScope;
  readonly params: ShareParams;
  readonly title: string;
}

export interface ShareRestrictions {
  readonly fixedPersonKey: string | null;
  readonly fixedDate: DateKey | null;
  readonly startDate: DateKey | null;
  readonly endDate: DateKey | null;
  readonly showSearch: boolean;
  readonly highlightChange: boolean;
}

const PREFIJO: Record<ShareScope, string> = {
  operacion: 'operacion',
  semana: 'semana',
  dia: 'dia',
  persona: 'persona',
  cambio: 'cambio',
};

export const ETIQUETA_SCOPE: Record<ShareScope, string> = {
  operacion: 'Toda la operación',
  semana: 'Esta semana con los filtros',
  dia: 'Un día',
  persona: 'Una persona',
  cambio: 'Un cambio',
};

export function prefijoDeAlcance(scope: ShareScope): string {
  return PREFIJO[scope];
}

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * `prefijo-` + 12 caracteres aleatorios base62 con `crypto.getRandomValues`
 * (plan §7.6). El hash corto de los mockups no sirve en producción: con 12
 * caracteres hay de sobra para que adivinarlo no sea viable.
 */
export function generarSlug(prefijo: string): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const azar = Array.from(bytes, (b) => BASE62[b % BASE62.length]).join('');
  return `${prefijo}-${azar}`;
}

export type Vencimiento = '24h' | '7d' | 'fin-de-mes';

/**
 * La fecha de vencimiento para cada opción del plan §7.6, a partir de
 * `ahora`. «Fin de mes» es el primer instante del mes siguiente, en la hora
 * local de quien crea el enlace (jefatura, que trabaja en
 * `America/El_Salvador`): a diferencia de los días del horario, esto sí es
 * un instante real, no un día de negocio (ADR-0008 no aplica aquí).
 */
export function calcularVencimiento(opcion: Vencimiento, ahora: Date = new Date()): Date {
  switch (opcion) {
    case '24h':
      return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'fin-de-mes':
      return new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1, 0, 0, 0, 0);
  }
}

/** ¿Sigue vigente un enlace, dado su vencimiento y si lo revocaron? */
export function enlaceVigente(expiresAt: string, revokedAt: string | null, ahora: Date = new Date()): boolean {
  if (revokedAt !== null) return false;
  return new Date(expiresAt).getTime() > ahora.getTime();
}

/** Restricciones de navegación que aplica `/s/:slug` además del filtro SQL. */
export function restriccionesDeEnlace(scope: ShareScope, params: ShareParams): ShareRestrictions {
  const fixedPersonKey = scope === 'persona' || scope === 'cambio' ? (params.person_key ?? null) : null;
  const fixedDate = scope === 'dia' || scope === 'cambio' ? (params.date ?? null) : null;
  const startDate = scope === 'semana' ? (params.start_date ?? null) : fixedDate;
  const endDate = scope === 'semana' && startDate !== null ? sumarDias(startDate, 6) : fixedDate;
  return {
    fixedPersonKey,
    fixedDate,
    startDate,
    endDate,
    showSearch: scope === 'operacion' || scope === 'semana' || scope === 'dia',
    highlightChange: scope === 'cambio',
  };
}

function sumarDias(date: DateKey, dias: number): DateKey {
  const [year, month, day] = date.split('-').map(Number);
  const valor = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}
