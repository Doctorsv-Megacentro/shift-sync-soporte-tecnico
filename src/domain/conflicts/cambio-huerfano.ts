/**
 * Regla `cambio-huerfano`: un cambio vigente apunta a una persona o a una
 * fecha que ya no está en la hoja. Severidad media. Ficha: docs/features/panel.md.
 */

import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'cambio-huerfano';

export function cambioHuerfano(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const cambio of ctx.overrides) {
    const mes = ctx.meses.find((m) => m.hoja.porPersona.get(cambio.personKey)?.has(cambio.date) === true);
    if (mes !== undefined) continue;
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${cambio.personKey}:${cambio.date}`,
        grupo: `${REGLA}:${cambio.personKey}:${cambio.date}`,
        severidad: 'media',
        tipo: 'Cambios',
        titulo: 'Cambio sobre un día que ya no está',
        resumen: `${cambio.personKey} · ${cambio.date}`,
        detalle: 'Hay un cambio de jefatura vigente para una persona o una fecha que la hoja ya no trae. Archivarlo lo revoca; la hoja no se toca.',
        fecha: cambio.date,
        etiquetaAccion: 'Archivar cambio',
        archivar: { personKey: cambio.personKey, date: cambio.date },
      }),
    );
  }
  return salida;
}
