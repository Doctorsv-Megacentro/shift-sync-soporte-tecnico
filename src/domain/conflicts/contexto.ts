/**
 * Horario efectivo (hoja + cambios) indexado para que cada regla no recorra
 * las entradas a mano. Ficha: docs/features/panel.md.
 */

import { SEDES } from '../catalog.ts';
import { buscarOverride, indexarOverrides, aplicarCambios, type DayOverride } from '../overlay.ts';
import { indexarMes, type IndiceMes } from '../presence.ts';
import type { DateKey, ParsedMonth, ScheduleEntry, SheetPerson, Site } from '../types.ts';

export interface ContextoMes {
  readonly mes: ParsedMonth;
  readonly hoja: IndiceMes;
  readonly efectivo: IndiceMes;
  readonly personas: ReadonlyMap<string, SheetPerson>;
}

export interface Contexto {
  readonly meses: readonly ContextoMes[];
  readonly overrides: readonly DayOverride[];
  readonly indiceOverrides: ReadonlyMap<string, DayOverride>;
}

const SEDES_CONOCIDAS: ReadonlySet<string> = new Set(SEDES);

export function esSite(valor: string | null): valor is Site {
  return valor !== null && SEDES_CONOCIDAS.has(valor);
}

/** Sede de esa persona ese día: la del cambio, si trae una, si no la del departamento. */
export function siteDelDia(siteDepartamento: Site, override: DayOverride | null): Site {
  if (override !== null && esSite(override.site)) return override.site;
  return siteDepartamento;
}

/** Meses visibles, con la capa de cambios ya aplicada. Los ocultos no entran al panel. */
export function preparar(months: readonly ParsedMonth[], overrides: readonly DayOverride[]): Contexto {
  const indiceOverrides = indexarOverrides(overrides);
  const meses = [...months]
    .filter((mes) => !mes.hidden)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((mes): ContextoMes => {
      const efectivo: ParsedMonth = { ...mes, entries: aplicarCambios(mes.entries, overrides) };
      return {
        mes,
        hoja: indexarMes(mes),
        efectivo: indexarMes(efectivo),
        personas: new Map(mes.people.map((p) => [p.key, p])),
      };
    });
  return { meses, overrides, indiceOverrides };
}

export function mesDe(ctx: Contexto, fecha: DateKey): ContextoMes | null {
  return ctx.meses.find((m) => m.mes.dates.includes(fecha)) ?? null;
}

export function entradasDe(ctx: Contexto, fecha: DateKey): readonly ScheduleEntry[] {
  return mesDe(ctx, fecha)?.efectivo.porFecha.get(fecha) ?? [];
}

export function overrideDe(ctx: Contexto, personKey: string, fecha: DateKey): DayOverride | null {
  return buscarOverride(ctx.indiceOverrides, personKey, fecha);
}
