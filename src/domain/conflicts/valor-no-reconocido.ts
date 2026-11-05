/**
 * Regla `valor-no-reconocido`: una celda quedó como `unknown`. Severidad
 * media. Ficha: docs/features/panel.md.
 */

import { formatFechaCorta } from '../time.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'valor-no-reconocido';

export function valorNoReconocido(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const mes of ctx.meses) {
    const porPersona = new Map<string, string[]>();
    for (const entry of mes.mes.entries) {
      if (entry.shift.kind !== 'unknown') continue;
      const fechas = porPersona.get(entry.personKey) ?? [];
      fechas.push(entry.date);
      porPersona.set(entry.personKey, fechas);
    }
    for (const [personKey, fechas] of porPersona) {
      const persona = mes.personas.get(personKey);
      const nombre = persona?.displayName ?? personKey;
      const primera = fechas[0] ?? mes.mes.month;
      const cuantos = fechas.length === 1 ? `el ${formatFechaCorta(primera)}` : `${fechas.length} días`;
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${personKey}:${primera}`,
          grupo: `${REGLA}:${personKey}`,
          severidad: 'media',
          tipo: 'Formato',
          titulo: `Valor que no se entiende`,
          resumen: `${nombre} · ${cuantos}`,
          detalle: `«${nombre}» tiene ${cuantos} sin un valor que se entienda. Revísalo con coordinación o edita el día.`,
          fecha: primera,
          enlace: true,
        }),
      );
    }
  }
  return salida;
}
