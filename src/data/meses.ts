/**
 * Reconstruye el jsonb de `get_shared_view` / `get_admin_schedule` a los
 * tipos del dominio (`ParsedMonth`, `DayOverride`), resolviendo rol/sede/área
 * con el catálogo. Compartido entre la vista de empleado y el horario
 * completo de jefatura.
 */

import { resolveDepartment } from '@/domain/catalog.ts';
import type { DayOverride } from '@/domain/overlay.ts';
import type { ParsedMonth, ScheduleEntry, SheetPerson } from '@/domain/types.ts';

export interface PersonaCruda {
  readonly key: string;
  readonly rawName: string;
  readonly displayName: string;
  readonly joinedOn: string | null;
  readonly displayNameSource?: 'auto' | 'manual';
}

export interface EntradaCruda {
  readonly personKey: string;
  readonly date: string;
  readonly department: string;
  readonly raw: string;
  readonly kind: 'work' | 'off' | 'vacation' | 'unknown';
  readonly startMin: number | null;
  readonly endMin: number | null;
}

export interface MesCrudo {
  readonly month: string;
  readonly dates: readonly string[];
  readonly people: readonly PersonaCruda[];
  readonly entries: readonly EntradaCruda[];
}

export interface OverrideCrudo {
  readonly personKey: string;
  readonly date: string;
  readonly kind: 'work' | 'off' | 'vacation';
  readonly startMin: number | null;
  readonly endMin: number | null;
  readonly site: string | null;
  readonly reason: string;
  readonly note: string | null;
  readonly supportPersonKey: string | null;
  readonly conflictKey?: string | null;
  readonly createdAt: string;
}

export function reconstruirMes(mes: MesCrudo): ParsedMonth {
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
      displayNameSource: p.displayNameSource === 'manual' ? 'manual' : 'auto',
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

export function reconstruirOverride(o: OverrideCrudo): DayOverride {
  return {
    personKey: o.personKey,
    date: o.date,
    kind: o.kind,
    startMin: o.startMin,
    endMin: o.endMin,
    site: o.site,
    reason: o.reason,
    note: o.note,
    supportPersonKey: o.supportPersonKey,
    conflictKey: o.conflictKey ?? null,
    createdAt: o.createdAt,
  };
}
