/**
 * Regla `descanso-corto`: entre dos turnos seguidos de la misma persona hay
 * menos de `DESCANSO_MIN_H`. Severidad alta. Ficha: docs/features/panel.md.
 */

import { DESCANSO_MIN_H } from '../config.ts';
import { formatDuration } from '../time.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import { paresDeDescanso, textoDescanso } from './pares-descanso.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'descanso-corto';

export function descansoCorto(ctx: Contexto): Conflicto[] {
  const umbral = DESCANSO_MIN_H * 60;
  const salida: Conflicto[] = [];
  for (const par of paresDeDescanso(ctx)) {
    if (par.minutos < 0 || par.minutos >= umbral) continue;
    const horas = Math.floor(par.minutos / 60);
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${par.person.key}:${par.desde}:${par.hasta}`,
        grupo: `${REGLA}:${horas}`,
        severidad: 'alta',
        tipo: 'Descanso',
        titulo: `Descanso de solo ${formatDuration(par.minutos)} entre turnos`,
        resumen: `${par.person.displayName} · ${par.department} · sale ${formatDuration(par.minutos)} antes de entrar`,
        detalle: textoDescanso(par),
        fecha: par.hasta,
        enlace: true,
      }),
    );
  }
  return salida;
}
