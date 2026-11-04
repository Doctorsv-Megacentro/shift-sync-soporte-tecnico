/**
 * Llama a la RPC pública `get_shared_view` y convierte su jsonb a los tipos
 * del dominio, para que la pantalla de empleado reutilice `domain/presence.ts`
 * y `domain/overlay.ts` tal cual. Ficha: docs/features/empleado.md.
 */

import { resolveDepartment } from '@/domain/catalog.ts';
import type { DayOverride } from '@/domain/overlay.ts';
import type { ShareScope } from '@/domain/share.ts';
import type { ParsedMonth, ScheduleEntry, SheetPerson } from '@/domain/types.ts';
import { supabase } from './supabase.ts';

interface PersonaCruda {
  readonly key: string;
  readonly rawName: string;
  readonly displayName: string;
  readonly joinedOn: string | null;
}

interface EntradaCruda {
  readonly personKey: string;
  readonly date: string;
  readonly department: string;
  readonly raw: string;
  readonly kind: 'work' | 'off' | 'vacation' | 'unknown';
  readonly startMin: number | null;
  readonly endMin: number | null;
}

interface MesCrudo {
  readonly month: string;
  readonly dates: readonly string[];
  readonly people: readonly PersonaCruda[];
  readonly entries: readonly EntradaCruda[];
}

interface OverrideCrudo {
  readonly personKey: string;
  readonly date: string;
  readonly kind: 'work' | 'off' | 'vacation';
  readonly startMin: number | null;
  readonly endMin: number | null;
  readonly site: string | null;
  readonly reason: string;
  readonly note: string | null;
  readonly supportPersonKey: string | null;
  readonly createdAt: string;
}

export interface FuenteInfo {
  readonly source: 'excel' | 'sheet';
  readonly sourceLabel: string;
  readonly importedAt: string;
}

interface VistaCruda {
  readonly scope: ShareScope;
  readonly title: string | null;
  readonly source: FuenteInfo | null;
  readonly months: readonly MesCrudo[];
  readonly overrides: readonly OverrideCrudo[];
}

export interface VistaCompartida {
  readonly scope: ShareScope;
  readonly title: string | null;
  readonly source: FuenteInfo | null;
  readonly months: readonly ParsedMonth[];
  readonly overrides: readonly DayOverride[];
}

export type ResultadoVista =
  | { tipo: 'inactivo' }
  | { tipo: 'alcance-no-disponible' }
  | { tipo: 'ok'; vista: VistaCompartida };

function reconstruirMes(mes: MesCrudo): ParsedMonth {
  const departamentoPorPersona = new Map<string, string>();
  for (const e of mes.entries) {
    if (!departamentoPorPersona.has(e.personKey)) departamentoPorPersona.set(e.personKey, e.department);
  }

  const people: SheetPerson[] = mes.people.map((p, i) => {
    const department = departamentoPorPersona.get(p.key) ?? '';
    const info = resolveDepartment(department);
    return {
      key: p.key,
      rawName: p.rawName,
      displayName: p.displayName,
      department,
      role: info.role,
      site: info.site,
      area: info.area,
      joinedOn: p.joinedOn,
      needsReview: false,
      row: i,
    };
  });

  const entries: ScheduleEntry[] = mes.entries.map((e) => ({
    personKey: e.personKey,
    date: e.date,
    department: e.department,
    shift:
      e.kind === 'work' && e.startMin !== null && e.endMin !== null
        ? { kind: 'work', startMin: e.startMin, endMin: e.endMin, raw: e.raw }
        : e.kind === 'off'
          ? { kind: 'off', raw: e.raw }
          : e.kind === 'vacation'
            ? { kind: 'vacation', raw: e.raw }
            : { kind: 'unknown', raw: e.raw },
  }));

  return {
    sheetName: mes.month,
    hidden: false,
    month: mes.month,
    dates: mes.dates,
    people,
    entries,
  };
}

/** Pide la vista pública de un enlace. Nunca lanza: el estado va en el resultado. */
export async function obtenerVistaCompartida(slug: string): Promise<ResultadoVista> {
  const { data, error } = await supabase.rpc('get_shared_view', { p_slug: slug });
  if (error) throw error;

  const cruda = data as VistaCruda | { error: string };
  if ('error' in cruda) {
    if (cruda.error === 'ALCANCE_NO_DISPONIBLE') return { tipo: 'alcance-no-disponible' };
    return { tipo: 'inactivo' };
  }

  return {
    tipo: 'ok',
    vista: {
      scope: cruda.scope,
      title: cruda.title,
      source: cruda.source,
      months: cruda.months.map(reconstruirMes),
      overrides: cruda.overrides.map((o) => ({
        personKey: o.personKey,
        date: o.date,
        kind: o.kind,
        startMin: o.startMin,
        endMin: o.endMin,
        site: o.site,
        reason: o.reason,
        note: o.note,
        supportPersonKey: o.supportPersonKey,
        createdAt: o.createdAt,
      })),
    },
  };
}
