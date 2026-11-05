/**
 * Regla `fecha-en-nombre`: el nombre trae un sufijo `(d/m)`, que se lee como
 * fecha de ingreso. Severidad baja. Ficha: docs/features/panel.md.
 */

import { formatFechaCorta } from '../time.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'fecha-en-nombre';

export function fechaEnNombre(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const mes of ctx.meses) {
    const personas = mes.mes.people.filter((p) => p.joinedOn !== null);
    if (personas.length === 0) continue;
    const ejemplo = personas[0];
    const cuando = ejemplo?.joinedOn !== null && ejemplo?.joinedOn !== undefined
      ? formatFechaCorta(ejemplo.joinedOn)
      : '';
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${mes.mes.month}`,
        grupo: `${REGLA}:${mes.mes.month}`,
        severidad: 'baja',
        tipo: 'Formato',
        titulo: 'Fecha escrita dentro del nombre',
        resumen: `${personas.length} ${personas.length === 1 ? 'persona trae' : 'personas traen'} su fecha de ingreso en el nombre`,
        detalle: `Se interpreta el sufijo «(d/m)» como fecha de ingreso${cuando === '' ? '' : `, por ejemplo ${cuando}`}. No cambia el horario.`,
        fecha: mes.mes.month,
      }),
    );
  }
  return salida;
}
