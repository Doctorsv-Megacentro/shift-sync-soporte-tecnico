/**
 * Regla `descanso-justo`: el descanso cabe entre `DESCANSO_MIN_H` y
 * `DESCANSO_AVISO_H`. Severidad baja. Ficha: docs/features/panel.md.
 */

import { DESCANSO_AVISO_H, DESCANSO_MIN_H } from '../config.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import { paresDeDescanso, textoDescanso } from './pares-descanso.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'descanso-justo';

export function descansoJusto(ctx: Contexto): Conflicto[] {
  const desde = DESCANSO_MIN_H * 60;
  const hasta = DESCANSO_AVISO_H * 60;
  const salida: Conflicto[] = [];
  for (const par of paresDeDescanso(ctx)) {
    if (par.minutos < desde || par.minutos >= hasta) continue;
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${par.person.key}:${par.desde}:${par.hasta}`,
        grupo: REGLA,
        severidad: 'baja',
        tipo: 'Descanso',
        titulo: `Descansos de ${DESCANSO_MIN_H} a ${DESCANSO_AVISO_H} horas`,
        resumen: `${par.person.displayName} · cierra y vuelve a entrar con ${DESCANSO_MIN_H}–${DESCANSO_AVISO_H} h`,
        detalle: textoDescanso(par),
        fecha: par.hasta,
        etiquetaAccion: 'Aceptar regla de 8 h mínimo',
        enlace: true,
      }),
    );
  }
  return salida;
}
