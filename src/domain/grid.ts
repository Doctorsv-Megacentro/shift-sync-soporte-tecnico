/**
 * Agrupa personas por departamento, filtra por nombre/sede/rol y calcula las
 * barras de la línea 00–24 de la vista Día. Horario completo de jefatura,
 * plan §7.4. Ficha: docs/features/horario.md.
 */

import { diaDe, type IndiceMes } from './presence.ts';
import { endsNextDay } from './shift.ts';
import { compararNombres, contieneTexto } from './text.ts';
import type { DateKey, Role, SheetPerson, ShiftValue, Site } from './types.ts';

export interface GrupoPersonas {
  /** El departamento tal como viene en la hoja, que es también la etiqueta del grupo. */
  readonly department: string;
  readonly role: Role;
  readonly site: Site;
  readonly area: string | null;
  readonly personas: readonly SheetPerson[];
}

/**
 * Agrupa por departamento (no por rol: dos departamentos pueden compartir
 * rol, como `MEGA N1` y `CC N1`), orden alfabético. Dentro de cada grupo, las
 * personas van por nombre a mostrar.
 */
export function agruparPorDepartamento(personas: readonly SheetPerson[]): GrupoPersonas[] {
  const grupos = new Map<string, SheetPerson[]>();
  for (const p of personas) {
    const lista = grupos.get(p.department);
    if (lista === undefined) grupos.set(p.department, [p]);
    else lista.push(p);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([department, miembros]) => {
      const ordenados = [...miembros].sort((x, y) => compararNombres(x.displayName, y.displayName));
      const primero = ordenados[0];
      if (primero === undefined) throw new Error(`Grupo sin personas: ${department}`);
      return { department, role: primero.role, site: primero.site, area: primero.area, personas: ordenados };
    });
}

export interface FiltrosHorario {
  readonly texto: string;
  readonly site: Site | 'Todas';
  readonly role: Role | 'Todos';
}

/** Filtra por nombre (sin tildes), sede y rol (plan §7.4). */
export function filtrarPersonas(
  personas: readonly SheetPerson[],
  filtros: FiltrosHorario,
): SheetPerson[] {
  return personas.filter((p) => {
    if (filtros.site !== 'Todas' && p.site !== filtros.site) return false;
    if (filtros.role !== 'Todos' && p.role !== filtros.role) return false;
    if (filtros.texto.trim() === '') return true;
    return contieneTexto(p.displayName, filtros.texto) || contieneTexto(p.rawName, filtros.texto);
  });
}

/** Cuántas de estas personas tienen turno ese día, para «n en turno hoy». */
export function contarEnTurno(indice: IndiceMes, personas: readonly SheetPerson[], date: DateKey): number {
  let n = 0;
  for (const p of personas) {
    const entry = diaDe(indice, p.key, date);
    if (entry !== null && entry.shift.kind === 'work') n++;
  }
  return n;
}

export interface Barra {
  /** Porcentaje desde la izquierda de la línea 00–24. */
  readonly leftPct: number;
  readonly widthPct: number;
}

/** Posición del turno de hoy en la línea 00–24. Lo que pasa de medianoche se recorta. */
export function barraDeHoy(shift: Extract<ShiftValue, { kind: 'work' }>): Barra {
  const fin = Math.min(shift.endMin, 1440);
  return {
    leftPct: (shift.startMin / 1440) * 100,
    widthPct: ((fin - shift.startMin) / 1440) * 100,
  };
}

/**
 * La parte del turno de ayer que cruza a hoy, como barra punteada desde las
 * 00:00 (plan §7.4: «hasta 06:00 (de ayer)»). `null` si ayer no fue un turno
 * que cruzara medianoche.
 */
export function barraDeAyer(shiftAyer: ShiftValue): Barra | null {
  if (shiftAyer.kind !== 'work' || !endsNextDay(shiftAyer)) return null;
  const finHoy = shiftAyer.endMin - 1440;
  return { leftPct: 0, widthPct: (finHoy / 1440) * 100 };
}
