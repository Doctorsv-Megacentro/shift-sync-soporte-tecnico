/**
 * Clave estable `regla:alcance` y textos cortos de fecha y hora que comparten
 * las reglas. Cambiar la forma de la clave deja huérfanos los acks (ADR-0007).
 */

import { MINUTOS_POR_DIA } from '../config.ts';
import { fold } from '../text.ts';
import { formatFechaCorta, formatMinutes, nombreDia } from '../time.ts';
import type { DateKey, Minutes } from '../types.ts';

/** `Tuscania` → `tuscania`, `Phoenix Tower` → `phoenix-tower`. */
export function slug(texto: string): string {
  return fold(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** El fin de un tramo que llega a medianoche se escribe `24:00`, no `00:00`. */
function horaDeClave(minutos: Minutes, esFin: boolean): string {
  if (esFin && minutos === MINUTOS_POR_DIA) return '24:00';
  return formatMinutes(minutos);
}

/** `cobertura-supervision:tuscania:2026-11-02:14:00-18:00`. */
export function claveIntervalo(
  regla: string,
  alcance: string,
  fecha: DateKey,
  inicio: Minutes,
  fin: Minutes,
): string {
  return `${regla}:${alcance}:${fecha}:${horaDeClave(inicio, false)}-${horaDeClave(fin, true)}`;
}

/** «Lun 2 nov», como la línea resumen del panel. */
export function etiquetaDia(fecha: DateKey): string {
  const dia = nombreDia(fecha);
  const abrev = dia.slice(0, 3);
  const capital = abrev.charAt(0).toLocaleUpperCase('es') + abrev.slice(1);
  return `${capital} ${formatFechaCorta(fecha)}`;
}

/** «14:00–18:00». Un tramo que cierra a medianoche termina en `24:00`. */
export function rangoHorario(inicio: Minutes, fin: Minutes): string {
  const finTexto = fin === MINUTOS_POR_DIA ? '24:00' : formatMinutes(fin);
  return `${formatMinutes(inicio)}–${finTexto}`;
}
