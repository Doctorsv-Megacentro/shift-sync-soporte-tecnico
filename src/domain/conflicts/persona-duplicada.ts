/**
 * Regla `persona-duplicada`: dos filas con la misma clave estable en un mes.
 * Severidad media. Ficha: docs/features/panel.md.
 */

import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'persona-duplicada';

export function personaDuplicada(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const mes of ctx.meses) {
    const filas = new Map<string, number>();
    for (const person of mes.mes.people) filas.set(person.key, (filas.get(person.key) ?? 0) + 1);
    for (const [personKey, n] of filas) {
      if (n < 2) continue;
      const persona = mes.personas.get(personKey);
      const nombre = persona?.displayName ?? personKey;
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${mes.mes.month}:${personKey}`,
          grupo: `${REGLA}:${personKey}`,
          severidad: 'media',
          tipo: 'Estructura',
          titulo: 'Persona repetida en el mes',
          resumen: `${nombre} · ${n} filas`,
          detalle: `«${nombre}» aparece ${n} veces en ${mes.mes.sheetName}. La clave estable es la misma, así que el horario puede pisarse.`,
          fecha: mes.mes.month,
        }),
      );
    }
  }
  return salida;
}
