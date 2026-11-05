/**
 * Unión y resta de tramos horarios, en minutos desde medianoche. Lo usan las
 * reglas de cobertura para encontrar huecos. Ficha: docs/features/panel.md.
 */

import { MINUTOS_POR_DIA } from '../config.ts';
import type { ShiftValue } from '../types.ts';

export interface Tramo {
  readonly start: number;
  readonly end: number;
}

/** Une tramos que se tocan o se solapan. Ignora los de duración cero. */
export function unir(tramos: readonly Tramo[]): Tramo[] {
  const ordenados = tramos
    .filter((t) => t.end > t.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const salida: Tramo[] = [];
  for (const tramo of ordenados) {
    const ultimo = salida[salida.length - 1];
    if (ultimo === undefined || tramo.start > ultimo.end) {
      salida.push(tramo);
    } else if (tramo.end > ultimo.end) {
      salida[salida.length - 1] = { start: ultimo.start, end: tramo.end };
    }
  }
  return salida;
}

/** Lo que queda de `base` después de quitar `quitar`. */
export function restar(base: readonly Tramo[], quitar: readonly Tramo[]): Tramo[] {
  let actual = unir(base);
  for (const hueco of unir(quitar)) {
    const siguiente: Tramo[] = [];
    for (const tramo of actual) {
      if (hueco.end <= tramo.start || hueco.start >= tramo.end) {
        siguiente.push(tramo);
        continue;
      }
      if (hueco.start > tramo.start) siguiente.push({ start: tramo.start, end: hueco.start });
      if (hueco.end < tramo.end) siguiente.push({ start: hueco.end, end: tramo.end });
    }
    actual = siguiente;
  }
  return actual;
}

/**
 * Parte de un turno que cae en un día calendario `[0, 1440)`.
 * `hoy`: desde la entrada hasta medianoche. `ayer`: lo que cruzó desde el día anterior.
 */
export function tramoDelDia(shift: ShiftValue, cual: 'hoy' | 'ayer'): Tramo | null {
  if (shift.kind !== 'work') return null;
  if (cual === 'hoy') {
    const fin = Math.min(shift.endMin, MINUTOS_POR_DIA);
    if (fin <= shift.startMin) return null;
    return { start: shift.startMin, end: fin };
  }
  if (shift.endMin <= MINUTOS_POR_DIA) return null;
  return { start: 0, end: shift.endMin - MINUTOS_POR_DIA };
}

/** Proyección de un turno sobre el reloj de 24 h, para la ventana habitual. */
export function proyeccion(shift: ShiftValue): Tramo[] {
  const hoy = tramoDelDia(shift, 'hoy');
  const ayer = tramoDelDia(shift, 'ayer');
  const salida: Tramo[] = [];
  if (hoy !== null) salida.push(hoy);
  if (ayer !== null) salida.push(ayer);
  return salida;
}
