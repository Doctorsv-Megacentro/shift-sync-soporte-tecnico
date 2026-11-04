/**
 * Interpreta el valor de una celda de día: turno, libre, vacaciones o sin dato.
 * Es el `parseShiftValue` de v1 reescrito (plan §6.1). Documentado en
 * docs/datos/formato-hoja.md.
 */

import {
  CATEGORIA_NOCHE_DESDE,
  CATEGORIA_TARDE_DESDE,
  FRANJA_DIA_DESDE,
  FRANJA_NOCHE_DESDE,
  FRANJA_TARDE_DESDE,
  MINUTOS_POR_DIA,
} from './config.ts';
import { normalize } from './text.ts';
import type { Band, Minutes, ShiftCategory, ShiftValue } from './types.ts';

/** `HH:MM-HH:MM`, con espacios opcionales alrededor del guion (como en v1). */
const RE_TURNO = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

/**
 * Interpreta una celda. Nunca lanza: lo que no se reconoce vuelve como
 * `unknown` conservando el texto original, para que la carga no se rompa y el
 * caso se pueda avisar (plan §5.3).
 */
export function parseShift(value: unknown): ShiftValue {
  const raw = value == null ? '' : String(value).trim();
  const norm = normalize(raw);

  if (norm === '') return { kind: 'unknown', raw };

  const m = RE_TURNO.exec(norm);
  if (m) {
    const h1 = Number(m[1]);
    const m1 = Number(m[2]);
    const h2 = Number(m[3]);
    const m2 = Number(m[4]);
    // Una hora como 25:00 o 10:75 no es un turno: se avisa en lugar de inventar.
    if (h1 > 24 || h2 > 24 || m1 > 59 || m2 > 59) return { kind: 'unknown', raw };

    const startMin = h1 * 60 + m1;
    let endMin = h2 * 60 + m2;
    // Si el fin no es posterior al inicio, el turno termina al día siguiente.
    // Por eso 15:00-00:00 llega a 1440 (las 24:00 del mismo día) y no a +1.
    if (endMin <= startMin) endMin += MINUTOS_POR_DIA;

    return { kind: 'work', startMin, endMin, raw };
  }

  if (norm === 'LIBRE') return { kind: 'off', raw };
  if (norm.includes('VACAC')) return { kind: 'vacation', raw };

  return { kind: 'unknown', raw };
}

/** ¿El turno termina después de medianoche? `15:00-00:00` **no** cuenta. */
export function endsNextDay(shift: ShiftValue): boolean {
  return shift.kind === 'work' && shift.endMin > MINUTOS_POR_DIA;
}

/** Duración en minutos, o `null` si el día no es un turno. */
export function shiftDuration(shift: ShiftValue): Minutes | null {
  return shift.kind === 'work' ? shift.endMin - shift.startMin : null;
}

/** ¿Es un día trabajado? Libre, vacaciones y sin dato no lo son. */
export function esTurno(shift: ShiftValue): shift is Extract<ShiftValue, { kind: 'work' }> {
  return shift.kind === 'work';
}

/**
 * Categoría de color, por la **hora de entrada**: antes de las 12:00 es de
 * mañana/día, antes de las 17:00 de tarde, el resto de noche. Libre y
 * vacaciones tienen su propio color (docs/diseno/tokens.md).
 */
export function shiftCategory(shift: ShiftValue): ShiftCategory {
  switch (shift.kind) {
    case 'off':
      return 'libre';
    case 'vacation':
      return 'vacaciones';
    case 'work':
      if (shift.startMin < CATEGORIA_TARDE_DESDE) return 'manana';
      if (shift.startMin < CATEGORIA_NOCHE_DESDE) return 'tarde';
      return 'noche';
    case 'unknown':
      return 'libre';
  }
}

/**
 * Franja del panel de jefatura, por la hora de entrada. **Es otra cosa que la
 * categoría de color**: aquí mañana y día se separan a las 08:00. Devuelve
 * `null` si el día no es un turno, porque las franjas solo cuentan turnos.
 */
export function shiftBand(shift: ShiftValue): Band | null {
  if (shift.kind !== 'work') return null;
  if (shift.startMin < FRANJA_DIA_DESDE) return 'Mañana';
  if (shift.startMin < FRANJA_TARDE_DESDE) return 'Día';
  if (shift.startMin < FRANJA_NOCHE_DESDE) return 'Tarde';
  return 'Noche';
}

/**
 * Dos días tienen «el mismo horario» si son turnos con la misma entrada y la
 * misma salida. Se compara lo interpretado, no el texto, para que `9:00-18:00`
 * y `09:00 - 18:00` cuenten como iguales (plan §7.1).
 */
export function mismoHorario(a: ShiftValue, b: ShiftValue): boolean {
  if (a.kind !== 'work' || b.kind !== 'work') return false;
  return a.startMin === b.startMin && a.endMin === b.endMin;
}

/** Clave estable de un horario, para agrupar: `540-1080`. */
export function claveHorario(shift: ShiftValue): string | null {
  return shift.kind === 'work' ? `${shift.startMin}-${shift.endMin}` : null;
}

/**
 * ¿Se solapan dos turnos del mismo día? Se usa para proponer compañeros de
 * apoyo y para medir la cobertura de una sede.
 */
export function seSolapan(a: ShiftValue, b: ShiftValue): boolean {
  if (a.kind !== 'work' || b.kind !== 'work') return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}
