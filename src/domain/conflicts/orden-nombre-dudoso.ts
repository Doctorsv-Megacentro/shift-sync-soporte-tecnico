/**
 * Regla `orden-nombre-dudoso`: `needsReview`. Los chips guardan el nombre
 * manual. Severidad baja. Ficha: docs/features/panel.md.
 */

import { alternativasDeNombre } from '../names.ts';
import { parseDateKey } from '../time.ts';
import { armar } from './base.ts';
import type { Contexto } from './contexto.ts';
import type { Conflicto, OpcionConflicto } from './types.ts';

const REGLA = 'orden-nombre-dudoso';

export function ordenNombreDudoso(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  const vistos = new Set<string>();
  for (const mes of ctx.meses) {
    const anio = parseDateKey(mes.mes.month).year;
    for (const person of mes.mes.people) {
      if (vistos.has(person.key) || person.displayNameSource === 'manual') continue;
      const alternativas = alternativasDeNombre(person.rawName, anio);
      if (alternativas === null) continue;
      vistos.add(person.key);
      const opciones: OpcionConflicto[] = [
        {
          id: 'nombre-primero',
          etiqueta: 'Nombre primero',
          asignacion: null,
          nombreManual: { personKey: person.key, displayName: alternativas.nombrePrimero },
        },
        {
          id: 'apellido-primero',
          etiqueta: 'Apellido primero',
          asignacion: null,
          nombreManual: { personKey: person.key, displayName: alternativas.apellidoPrimero },
        },
      ];
      salida.push(
        armar({
          regla: REGLA,
          key: `${REGLA}:${person.key}`,
          grupo: `${REGLA}:${person.key}`,
          severidad: 'baja',
          tipo: 'Formato',
          titulo: 'Orden del nombre por confirmar',
          resumen: `${person.displayName} · «${person.rawName.trim()}»`,
          detalle: `No está claro si «${person.rawName.trim()}» empieza por el nombre o por el apellido. Elige cómo mostrarlo.`,
          fecha: mes.mes.month,
          opciones,
          exigeOpcion: true,
          etiquetaAccion: 'Guardar nombre',
        }),
      );
    }
  }
  return salida;
}
