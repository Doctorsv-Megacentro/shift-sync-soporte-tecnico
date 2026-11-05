/**
 * Regla `departamento-desconocido`: el departamento no está en el catálogo.
 * Severidad media. Ficha: docs/features/panel.md.
 */

import { esDepartamentoMalEscrito } from '../catalog.ts';
import { armar } from './base.ts';
import { slug } from './clave.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'departamento-desconocido';

export function departamentoDesconocido(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  const vistos = new Set<string>();
  for (const mes of ctx.meses) {
    for (const person of mes.mes.people) {
      if (person.department === '' || esDepartamentoMalEscrito(person.department)) continue;
      if (person.role !== 'Otro' || person.site !== 'Sin sede') continue;
      const id = slug(person.department);
      if (vistos.has(id)) continue;
      vistos.add(id);
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${id}`,
          grupo: `${REGLA}:${id}`,
          severidad: 'media',
          tipo: 'Formato',
          titulo: 'Departamento fuera del catálogo',
          resumen: person.department,
          detalle: `El departamento «${person.department}» no está en el catálogo: su gente queda sin sede ni rol. Añádelo al catálogo con un cambio en el repositorio.`,
          fecha: mes.mes.month,
        }),
      );
    }
  }
  return salida;
}
