/**
 * Regla `racha-larga`: una persona trabaja `RACHA_MAX` días seguidos o más.
 * Severidad media. Ficha: docs/features/panel.md.
 */

import { RACHA_MAX } from '../config.ts';
import { formatFechaCorta } from '../time.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'racha-larga';

export function rachaLarga(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const mes of ctx.meses) {
    for (const person of mes.personas.values()) {
      const dias = mes.efectivo.porPersona.get(person.key);
      if (dias === undefined) continue;
      let inicio = '';
      let fin = '';
      let cuenta = 0;

      const cerrar = (): void => {
        if (cuenta >= RACHA_MAX && inicio !== '' && fin !== '') {
          salida.push(
            armar({
              regla: REGLA,
              key: `${REGLA}:${person.key}:${inicio}:${fin}`,
              grupo: `${REGLA}:${person.key}:${inicio}:${fin}`,
              severidad: 'media',
              tipo: 'Descanso',
              titulo: `${person.displayName}: ${cuenta} días seguidos`,
              resumen: `Del ${formatFechaCorta(inicio)} al ${formatFechaCorta(fin)}`,
              detalle: `${person.displayName} (${person.department}) trabaja del ${formatFechaCorta(inicio)} al ${formatFechaCorta(fin)} sin día libre.`,
              fecha: inicio,
              enlace: true,
            }),
          );
        }
        inicio = '';
        fin = '';
        cuenta = 0;
      };

      for (const fecha of mes.mes.dates) {
        const entry = dias.get(fecha);
        if (entry !== undefined && entry.shift.kind === 'work') {
          if (cuenta === 0) inicio = fecha;
          fin = fecha;
          cuenta += 1;
        } else {
          cerrar();
        }
      }
      cerrar();
    }
  }
  return salida;
}
