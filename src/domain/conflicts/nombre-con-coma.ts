/**
 * Regla `nombre-con-coma`: el nombre viene como `APELLIDOS, NOMBRES`.
 * Severidad baja. Ficha: docs/features/panel.md.
 */

import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'nombre-con-coma';

export function nombreConComa(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  const vistos = new Set<string>();
  for (const mes of ctx.meses) {
    for (const person of mes.mes.people) {
      if (!person.rawName.includes(',') || vistos.has(person.key)) continue;
      vistos.add(person.key);
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${person.key}`,
          grupo: `${REGLA}:${person.key}`,
          severidad: 'baja',
          tipo: 'Formato',
          titulo: 'Nombre con coma',
          resumen: `«${person.rawName.trim()}» · se muestra como «${person.displayName}»`,
          detalle: `Es un nombre en formato «APELLIDOS, NOMBRES». Se invierte al mostrarlo y queda «${person.displayName}».`,
          fecha: mes.mes.month,
        }),
      );
    }
  }
  return salida;
}
