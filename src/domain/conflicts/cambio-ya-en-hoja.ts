/**
 * Regla `cambio-ya-en-hoja`: la hoja nueva ya trae el mismo valor que el
 * cambio de jefatura. Severidad baja. Ficha: docs/features/panel.md.
 */

import { shiftDeOverride } from '../overlay.ts';
import { mismoHorario } from '../shift.ts';
import { armar } from './base.ts';
import { esSite, siteDelDia, type Contexto } from './contexto.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'cambio-ya-en-hoja';

export function cambioYaEnHoja(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];
  for (const cambio of ctx.overrides) {
    let coincide = false;
    for (const mes of ctx.meses) {
      const entry = mes.hoja.porPersona.get(cambio.personKey)?.get(cambio.date);
      const persona = mes.personas.get(cambio.personKey);
      if (entry === undefined || persona === undefined) continue;
      const delCambio = shiftDeOverride(cambio);
      const turnoIgual =
        delCambio.kind === 'work'
          ? mismoHorario(entry.shift, delCambio)
          : entry.shift.kind === delCambio.kind;
      const sedeIgual = cambio.site === null || !esSite(cambio.site) || siteDelDia(persona.site, cambio) === persona.site;
      coincide = turnoIgual && sedeIgual;
      break;
    }
    if (!coincide) continue;
    salida.push(
      armar({
        regla: REGLA,
        key: `${REGLA}:${cambio.personKey}:${cambio.date}`,
        grupo: `${REGLA}:${cambio.personKey}:${cambio.date}`,
        severidad: 'baja',
        tipo: 'Cambios',
        titulo: 'La hoja ya trae este cambio',
        resumen: `${cambio.date} · ${cambio.reason}`,
        detalle: 'La versión nueva de la hoja ya tiene el mismo valor que este cambio de jefatura. Archivarlo deja el día como viene en la hoja.',
        fecha: cambio.date,
        etiquetaAccion: 'Archivar cambio',
        archivar: { personKey: cambio.personKey, date: cambio.date },
      }),
    );
  }
  return salida;
}
