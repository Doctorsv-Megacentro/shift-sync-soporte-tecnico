/**
 * Regla `cambios-vs-mes-anterior`: ingresos, salidas o cambios de departamento
 * contra el mes previo. Severidad baja. Ficha: docs/features/panel.md.
 */

import { diffMonths, resumirDiff } from '../diff.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'cambios-vs-mes-anterior';

export function cambiosVsMesAnterior(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (let i = 1; i < ctx.meses.length; i++) {
    const anterior = ctx.meses[i - 1];
    const actual = ctx.meses[i];
    if (anterior === undefined || actual === undefined) continue;
    const diff = diffMonths(anterior.mes, actual.mes);
    const partes = resumirDiff(diff);
    if (partes.length === 0) continue;
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${anterior.mes.month}:${actual.mes.month}`,
        grupo: `${REGLA}:${actual.mes.month}`,
        severidad: 'baja',
        tipo: 'Cambios',
        titulo: partes.join(' y '),
        resumen: `Contra ${anterior.mes.sheetName === 'combinado' ? anterior.mes.month : anterior.mes.sheetName}`,
        detalle: `${partes.join(' · ')}. Comparado por la clave estable de cada persona, así un nombre reescrito no cuenta como ingreso y salida.`,
        fecha: actual.mes.month,
      }),
    );
  }
  return salida;
}
