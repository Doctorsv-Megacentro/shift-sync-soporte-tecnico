/**
 * Fechas y horas del dominio: `DateKey` en texto, minutos desde medianoche y
 * semanas que empiezan en lunes. Nunca se usa `Date` para representar un día
 * (ADR-0008). Documentado en docs/datos/formato-hoja.md.
 */

import { MINUTOS_POR_DIA } from './config.ts';
import type { DateKey, Minutes } from './types.ts';

/** Días entre el 1900-01-01 de Excel (serial 1) y el epoch de Unix. */
const SERIAL_EPOCH_UNIX = 25569;
/** Serial de 9999-12-31. Más allá no es una fecha razonable de una hoja. */
const SERIAL_MAX = 2958465;
/** El 29-feb-1900 que Excel cuenta y el calendario no tiene. */
const SERIAL_FEB29_FICTICIO = 60;
const MS_POR_DIA = 86_400_000;

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

const dos = (n: number): string => String(n).padStart(2, '0');

/** Construye un `DateKey`. Devuelve `null` si la fecha no existe (31 de feb). */
export function toDateKey(year: number, month: number, day: number): DateKey | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Se valida contra el calendario real: el 2026-02-30 no existe.
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${dos(month)}-${dos(day)}`;
}

/** Descompone un `DateKey`. Lanza si no tiene el formato esperado. */
export function parseDateKey(key: DateKey): { year: number; month: number; day: number } {
  const m = RE_ISO.exec(key);
  if (!m) throw new Error(`DateKey inválido: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** ¿Es un `DateKey` con formato correcto y una fecha que existe de verdad? */
export function esDateKey(value: unknown): value is DateKey {
  if (typeof value !== 'string') return false;
  const m = RE_ISO.exec(value);
  if (!m) return false;
  return toDateKey(Number(m[1]), Number(m[2]), Number(m[3])) === value;
}

/**
 * Serial de Excel → `DateKey`. La aritmética es en UTC para no arrastrar la
 * zona del navegador.
 *
 * Excel cuenta un 29 de febrero de 1900 que nunca existió, así que sus seriales
 * anteriores a ese día ficticio van desplazados un día respecto al calendario
 * real. Se compensa, y el serial 60 se rechaza porque no es ninguna fecha.
 */
function desdeSerialExcel(serial: number): DateKey | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > SERIAL_MAX) return null;
  if (Math.floor(serial) === SERIAL_FEB29_FICTICIO) return null;
  const ajustado = serial < SERIAL_FEB29_FICTICIO ? serial + 1 : serial;
  const d = new Date(Math.round((ajustado - SERIAL_EPOCH_UNIX) * MS_POR_DIA));
  return toDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Interpreta como fecha lo que venga de una celda y devuelve un `DateKey`, o
 * `null` si no es una fecha. Es el `coerceSheetDate` de v1, reescrito para
 * devolver texto en vez de `Date` (plan §6.1).
 *
 * Hace falta porque un `.xlsx` exportado desde Google Sheets no siempre trae
 * las fechas tipadas. Acepta cuatro formas:
 *
 * - `Date` (lo que da SheetJS con `cellDates`): se leen sus partes locales,
 *   que es como SheetJS las construye;
 * - número: serial de Excel, la forma habitual al leer con `raw: true`;
 * - `YYYY-MM-DD`;
 * - `dd/mm/yyyy` o `dd-mm-yyyy`.
 */
export function coerceDateKey(value: unknown): DateKey | null {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return toDateKey(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === 'number') return desdeSerialExcel(value);

  if (typeof value === 'string') {
    const s = value.trim();
    const iso = RE_ISO.exec(s);
    if (iso) return toDateKey(Number(iso[1]), Number(iso[2]), Number(iso[3]));

    const dmy = RE_DMY.exec(s);
    if (dmy) return toDateKey(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

    // Un número en texto también puede ser un serial.
    if (/^\d+(\.\d+)?$/.test(s)) return desdeSerialExcel(Number(s));
  }

  return null;
}

/** Suma días (puede ser negativo) y devuelve el `DateKey` resultante. */
export function addDays(key: DateKey, days: number): DateKey {
  const { year, month, day } = parseDateKey(key);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  const salida = toDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (salida === null) throw new Error(`Fecha fuera de rango: ${key} + ${days}`);
  return salida;
}

/** Días entre dos fechas (`b - a`). */
export function diffDays(a: DateKey, b: DateKey): number {
  const pa = parseDateKey(a);
  const pb = parseDateKey(b);
  const ma = Date.UTC(pa.year, pa.month - 1, pa.day);
  const mb = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((mb - ma) / MS_POR_DIA);
}

/** Día de la semana con **lunes = 0** y domingo = 6 (plan §7.1). */
export function weekday(key: DateKey): number {
  const { year, month, day } = parseDateKey(key);
  const domingoCero = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (domingoCero + 6) % 7;
}

/** El lunes de la semana a la que pertenece `key`. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekday(key));
}

/** Los 7 días de la semana de `key`, de lunes a domingo. */
export function weekDates(key: DateKey): DateKey[] {
  const lunes = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
}

/** El primer día del mes de `key`, que es como se identifica un mes. */
export function firstOfMonth(key: DateKey): DateKey {
  const { year, month } = parseDateKey(key);
  const salida = toDateKey(year, month, 1);
  if (salida === null) throw new Error(`Fecha inválida: ${key}`);
  return salida;
}

/** Minutos desde medianoche → `HH:MM`. Normaliza lo que pasa de 24 h. */
export function formatMinutes(min: Minutes): string {
  const total = ((Math.round(min) % MINUTOS_POR_DIA) + MINUTOS_POR_DIA) % MINUTOS_POR_DIA;
  return `${dos(Math.floor(total / 60))}:${dos(total % 60)}`;
}

/** `HH:MM` → minutos desde medianoche, o `null` si no es una hora válida. */
export function parseMinutes(texto: string): Minutes | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(texto.trim());
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2]);
  if (horas > 24 || minutos > 59) return null;
  if (horas === 24 && minutos !== 0) return null;
  return horas * 60 + minutos;
}

/** Minutos → `9 h` o `8 h 30 min`, para mostrar una duración. */
export function formatDuration(min: Minutes): string {
  const total = Math.max(0, Math.round(min));
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  if (horas === 0) return `${minutos} min`;
  if (minutos === 0) return `${horas} h`;
  return `${horas} h ${minutos} min`;
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
] as const;

/** Nombre del día en español, en minúscula: «lunes». */
export function nombreDia(key: DateKey): string {
  return DIAS[weekday(key)] ?? '';
}

/** Nombre del mes en español, en minúscula: «noviembre». */
export function nombreMes(key: DateKey): string {
  return MESES[parseDateKey(key).month - 1] ?? '';
}

/** «lunes 2 de noviembre», como se escribe en la interfaz. */
export function formatFechaLarga(key: DateKey): string {
  const { day } = parseDateKey(key);
  return `${nombreDia(key)} ${day} de ${nombreMes(key)}`;
}

/** «2 nov», para las etiquetas cortas. */
export function formatFechaCorta(key: DateKey): string {
  const { day } = parseDateKey(key);
  return `${day} ${nombreMes(key).slice(0, 3)}`;
}
