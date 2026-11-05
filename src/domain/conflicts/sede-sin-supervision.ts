/**
 * Regla `sede-sin-supervision`: una sede tiene N1 o N2 y ningún departamento
 * de supervisor. Hoy es el caso de Phoenix Tower. Ficha: docs/features/panel.md.
 */

import { armar } from './base.ts';
import { slug } from './clave.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';
import type { Site } from '../types.ts';

const REGLA = 'sede-sin-supervision';

export function sedeSinSupervision(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const mes of ctx.meses) {
    const porSede = new Map<Site, { n1: number; n2: number; supervisores: number }>();
    for (const person of mes.personas.values()) {
      const actual = porSede.get(person.site) ?? { n1: 0, n2: 0, supervisores: 0 };
      if (person.role === 'N1') actual.n1 += 1;
      else if (person.role === 'N2') actual.n2 += 1;
      else if (person.role === 'Supervisor') actual.supervisores += 1;
      porSede.set(person.site, actual);
    }

    for (const [sede, cuenta] of porSede) {
      if (sede === 'Sin sede') continue;
      if (cuenta.n1 + cuenta.n2 === 0 || cuenta.supervisores > 0) continue;
      const alcance = slug(sede);
      const personas = cuenta.n1 + cuenta.n2;
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${alcance}:${mes.mes.month}`,
          grupo: `${REGLA}:${alcance}`,
          severidad: 'media',
          tipo: 'Estructura',
          titulo: `${sede} sin supervisión en la hoja`,
          resumen: `${personas} ${personas === 1 ? 'persona' : 'personas'} N1/N2 · no hay departamento de supervisor`,
          detalle: `${sede} tiene ${cuenta.n1} N1 y ${cuenta.n2} N2, y ningún supervisor con esa sede. Acepta el caso con una nota mientras no exista ese departamento.`,
          fecha: mes.mes.month,
          etiquetaAccion: 'Aceptar con nota',
        }),
      );
    }
  }
  return salida;
}
