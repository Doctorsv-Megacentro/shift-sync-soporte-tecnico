/**
 * Horario efectivo: la hoja más los cambios de jefatura, mezclados
 * (ADR-0003). `day_overrides` nunca toca `schedule_entries`; esto construye,
 * a partir de ambos, lo que de verdad se muestra y lo que revisan las
 * reglas de conflicto.
 */

import { formatMinutes } from './time.ts';
import type { DateKey, ScheduleEntry, ShiftValue } from './types.ts';

/** Un cambio de jefatura vigente, tal como lo devuelve `get_shared_view` o la base. Nunca trae quién lo hizo. */
export interface DayOverride {
  readonly personKey: string;
  readonly date: DateKey;
  readonly kind: 'work' | 'off' | 'vacation';
  readonly startMin: number | null;
  readonly endMin: number | null;
  /** Sede distinta a la habitual de la persona, si el cambio la cambió. */
  readonly site: string | null;
  readonly reason: string;
  readonly note: string | null;
  readonly supportPersonKey: string | null;
  readonly createdAt: DateKey;
}

/** `personKey|date`, la clave con la que se busca un cambio. */
export function claveOverride(personKey: string, date: DateKey): string {
  return `${personKey}|${date}`;
}

/** Índice de cambios por persona y fecha, para no recorrer el array cada vez. */
export function indexarOverrides(overrides: readonly DayOverride[]): Map<string, DayOverride> {
  return new Map(overrides.map((o) => [claveOverride(o.personKey, o.date), o]));
}

export function buscarOverride(
  indice: ReadonlyMap<string, DayOverride>,
  personKey: string,
  date: DateKey,
): DayOverride | null {
  return indice.get(claveOverride(personKey, date)) ?? null;
}

/** El turno que describe un cambio de jefatura, en la forma de `ShiftValue`. */
export function shiftDeOverride(o: DayOverride): ShiftValue {
  if (o.kind === 'work' && o.startMin !== null && o.endMin !== null) {
    return {
      kind: 'work',
      startMin: o.startMin,
      endMin: o.endMin,
      raw: `${formatMinutes(o.startMin)}-${formatMinutes(o.endMin % 1440)}`,
    };
  }
  if (o.kind === 'off') return { kind: 'off', raw: 'Libre' };
  return { kind: 'vacation', raw: 'Vacaciones' };
}

/**
 * El horario efectivo de una entrada: el cambio de jefatura si lo hay, si no
 * lo que trae la hoja. `department` se conserva de la hoja siempre: el
 * cambio solo puede traer una `site` distinta, nunca un departamento nuevo.
 */
export function entradaEfectiva(
  entry: ScheduleEntry,
  override: DayOverride | null,
): ScheduleEntry {
  if (override === null) return entry;
  return { ...entry, shift: shiftDeOverride(override) };
}

/** Aplica los cambios de jefatura a todas las entradas de un mes. */
export function aplicarCambios(
  entries: readonly ScheduleEntry[],
  overrides: readonly DayOverride[],
): ScheduleEntry[] {
  const indice = indexarOverrides(overrides);
  return entries.map((e) => entradaEfectiva(e, buscarOverride(indice, e.personKey, e.date)));
}

/** ¿Esta entrada tiene un cambio de jefatura vigente? Para el punto naranja. */
export function tieneCambio(
  indice: ReadonlyMap<string, DayOverride>,
  personKey: string,
  date: DateKey,
): boolean {
  return buscarOverride(indice, personKey, date) !== null;
}
