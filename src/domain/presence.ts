/**
 * Quién está un día: el mismo horario, el equipo de la persona, o toda la
 * operación. Es el corazón de la vista de empleado (plan §7.1).
 *
 * Se adelanta de la Fase 3 porque la demo local lo necesita (ADR-0013).
 */

import { claveHorario, esTurno, mismoHorario } from './shift.ts';
import { compararNombres, contieneTexto } from './text.ts';
import { formatMinutes } from './time.ts';
import type { DateKey, ParsedMonth, ScheduleEntry, SheetPerson, ShiftValue } from './types.ts';

/** Los tres segmentos de «Quién está ese día». */
export type Alcance = 'mismo-horario' | 'mi-equipo' | 'toda-la-operacion';

/** Una persona presente un día, con lo que la fila necesita mostrar. */
export interface Presente {
  readonly person: SheetPerson;
  readonly shift: ShiftValue;
}

/** Un grupo «Entran HH:MM · n» de la lista de presencia. */
export interface GrupoEntrada {
  /** `06:00`, la hora de entrada que comparten. */
  readonly hora: string;
  readonly startMin: number;
  readonly personas: readonly Presente[];
}

/** Índice de un mes, para no recorrer las entradas en cada consulta. */
export interface IndiceMes {
  readonly personas: ReadonlyMap<string, SheetPerson>;
  /** `fecha → entradas de ese día`. */
  readonly porFecha: ReadonlyMap<DateKey, readonly ScheduleEntry[]>;
  /** `personKey → fecha → entrada`. */
  readonly porPersona: ReadonlyMap<string, ReadonlyMap<DateKey, ScheduleEntry>>;
}

/** Construye el índice una vez y se reutiliza en toda la pantalla. */
export function indexarMes(mes: ParsedMonth): IndiceMes {
  const personas = new Map(mes.people.map((p) => [p.key, p]));
  const porFecha = new Map<DateKey, ScheduleEntry[]>();
  const porPersona = new Map<string, Map<DateKey, ScheduleEntry>>();

  for (const entry of mes.entries) {
    const delDia = porFecha.get(entry.date);
    if (delDia === undefined) porFecha.set(entry.date, [entry]);
    else delDia.push(entry);

    let dePersona = porPersona.get(entry.personKey);
    if (dePersona === undefined) {
      dePersona = new Map();
      porPersona.set(entry.personKey, dePersona);
    }
    dePersona.set(entry.date, entry);
  }

  return { personas, porFecha, porPersona };
}

/** El día de una persona, o `null` si esa fecha no está en el mes. */
export function diaDe(
  indice: IndiceMes,
  personKey: string,
  date: DateKey,
): ScheduleEntry | null {
  return indice.porPersona.get(personKey)?.get(date) ?? null;
}

/**
 * Quién trabaja un día, según el alcance pedido.
 *
 * - `mismo-horario`: exactamente la misma entrada y salida que la persona.
 *   Si su día es libre no hay horario que comparar y la lista va vacía: la
 *   interfaz deshabilita el segmento (plan §7.1).
 * - `mi-equipo`: el mismo departamento **de ese día**, no el del mes.
 * - `toda-la-operacion`: todos los que trabajan.
 *
 * La persona consultada nunca aparece en su propia lista.
 */
export function quienEsta(
  indice: IndiceMes,
  date: DateKey,
  alcance: Alcance,
  personKey: string | null,
): Presente[] {
  const delDia = indice.porFecha.get(date) ?? [];
  const propia = personKey === null ? null : diaDe(indice, personKey, date);

  if (alcance === 'mismo-horario' && (propia === null || !esTurno(propia.shift))) return [];

  const salida: Presente[] = [];
  for (const entry of delDia) {
    if (entry.personKey === personKey) continue;
    if (!esTurno(entry.shift)) continue;

    if (alcance === 'mismo-horario') {
      if (propia === null || !mismoHorario(entry.shift, propia.shift)) continue;
    } else if (alcance === 'mi-equipo') {
      if (propia === null || entry.department !== propia.department) continue;
    }

    const person = indice.personas.get(entry.personKey);
    if (person !== undefined) salida.push({ person, shift: entry.shift });
  }

  return ordenarPresentes(salida);
}

/** Por hora de entrada y, dentro de la misma hora, por nombre. */
export function ordenarPresentes(presentes: readonly Presente[]): Presente[] {
  return [...presentes].sort((a, b) => {
    const sa = a.shift.kind === 'work' ? a.shift.startMin : Number.MAX_SAFE_INTEGER;
    const sb = b.shift.kind === 'work' ? b.shift.startMin : Number.MAX_SAFE_INTEGER;
    if (sa !== sb) return sa - sb;
    return compararNombres(a.person.displayName, b.person.displayName);
  });
}

/**
 * Agrupa la lista en «Entran HH:MM · n», que es como se lee en la captura 03.
 * Los grupos salen ordenados por hora de entrada.
 */
export function agruparPorEntrada(presentes: readonly Presente[]): GrupoEntrada[] {
  const grupos = new Map<number, Presente[]>();
  for (const p of presentes) {
    if (p.shift.kind !== 'work') continue;
    const lista = grupos.get(p.shift.startMin);
    if (lista === undefined) grupos.set(p.shift.startMin, [p]);
    else lista.push(p);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([startMin, personas]) => ({
      startMin,
      hora: formatMinutes(startMin),
      personas: ordenarPresentes(personas),
    }));
}

/**
 * Busca personas por cualquier parte del nombre, **ignorando tildes y
 * mayúsculas**: «jose» encuentra «José». Devuelve como máximo `limite`
 * resultados, ordenados por nombre (plan §7.1).
 */
export function buscarPersonas(
  mes: ParsedMonth,
  consulta: string,
  limite = 6,
): SheetPerson[] {
  const texto = consulta.trim();
  if (texto === '') return [];
  return mes.people
    .filter((p) => contieneTexto(p.displayName, texto) || contieneTexto(p.rawName, texto))
    .sort((a, b) => compararNombres(a.displayName, b.displayName))
    .slice(0, limite);
}

/** Resumen de una semana: cuántos turnos y cuántas horas (plan §7.1). */
export interface ResumenSemana {
  readonly turnos: number;
  readonly minutos: number;
}

export function resumirSemana(
  indice: IndiceMes,
  personKey: string,
  fechas: readonly DateKey[],
): ResumenSemana {
  let turnos = 0;
  let minutos = 0;
  for (const fecha of fechas) {
    const entry = diaDe(indice, personKey, fecha);
    if (entry !== null && entry.shift.kind === 'work') {
      turnos++;
      minutos += entry.shift.endMin - entry.shift.startMin;
    }
  }
  return { turnos, minutos };
}

/** Métricas de un día. «En turno» cuenta los turnos que **empiezan** ese día. */
export interface MetricasDia {
  readonly enTurno: number;
  readonly total: number;
  readonly libres: number;
  readonly vacaciones: number;
  readonly cruzanMedianoche: number;
}

export function metricasDelDia(indice: IndiceMes, date: DateKey): MetricasDia {
  const delDia = indice.porFecha.get(date) ?? [];
  let enTurno = 0;
  let libres = 0;
  let vacaciones = 0;
  let cruzan = 0;

  for (const { shift } of delDia) {
    if (shift.kind === 'work') {
      enTurno++;
      if (shift.endMin > 1440) cruzan++;
    } else if (shift.kind === 'off') libres++;
    else if (shift.kind === 'vacation') vacaciones++;
  }

  return {
    enTurno,
    total: indice.personas.size,
    libres,
    vacaciones,
    cruzanMedianoche: cruzan,
  };
}

/** Cuenta cuántas personas comparten exactamente un horario, para agrupar. */
export function contarPorHorario(indice: IndiceMes, date: DateKey): Map<string, number> {
  const cuenta = new Map<string, number>();
  for (const { shift } of indice.porFecha.get(date) ?? []) {
    const clave = claveHorario(shift);
    if (clave === null) continue;
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
  }
  return cuenta;
}
