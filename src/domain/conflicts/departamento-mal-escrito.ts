/**
 * Regla `departamento-mal-escrito`: el departamento coincide con un alias
 * conocido (por ejemplo «Adminsitrador»). Severidad baja. Ficha: docs/features/panel.md.
 */

import { esDepartamentoMalEscrito, formaCorrecta } from '../catalog.ts';
import { armar } from './base.ts';
import { slug } from './clave.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'departamento-mal-escrito';

export function departamentoMalEscrito(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  const vistos = new Set<string>();
  for (const mes of ctx.meses) {
    for (const person of mes.mes.people) {
      if (!esDepartamentoMalEscrito(person.department)) continue;
      const id = slug(person.department);
      if (vistos.has(id)) continue;
      vistos.add(id);
      const correcta = formaCorrecta(person.department) ?? person.department;
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${id}`,
          grupo: `${REGLA}:${id}`,
          severidad: 'baja',
          tipo: 'Formato',
          titulo: 'Departamento mal escrito',
          resumen: `«${person.department}» · debería ser «${correcta}»`,
          detalle: `El departamento «${person.department}» está mal escrito en la hoja. Debería ser «${correcta}». Se reconoce igual; corregirlo en la hoja es un cambio con coordinación.`,
          fecha: mes.mes.month,
        }),
      );
    }
  }
  return salida;
}
