/**
 * Regla `vacaciones-mayusculas`: la hoja mezcla variantes de «Vacaciones».
 * Severidad baja. Ficha: docs/features/panel.md.
 */

import { normalize } from '../text.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'vacaciones-mayusculas';

export function vacacionesMayusculas(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const mes of ctx.meses) {
    const variantes = new Set<string>();
    let mayusculas = 0;
    for (const entry of mes.mes.entries) {
      if (entry.shift.kind !== 'vacation') continue;
      variantes.add(entry.shift.raw);
      if (entry.shift.raw === normalize(entry.shift.raw) && entry.shift.raw !== '') mayusculas += 1;
    }
    if (variantes.size < 2 || mayusculas === 0) continue;
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${mes.mes.month}`,
        grupo: `${REGLA}:${mes.mes.month}`,
        severidad: 'baja',
        tipo: 'Formato',
        titulo: '«VACACIONES» en mayúsculas',
        resumen: `${mayusculas} ${mayusculas === 1 ? 'celda' : 'celdas'} · ${variantes.size} formas de escribirlo`,
        detalle: `«Vacaciones» viene escrito de ${variantes.size} formas distintas. Se interpretan todas igual.`,
        fecha: mes.mes.month,
      }),
    );
  }
  return salida;
}
