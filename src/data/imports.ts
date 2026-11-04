/**
 * Publica y consulta versiones del horario: arma el payload que espera la
 * RPC `publish_import` a partir de lo que ya leyó `domain/workbook.ts`, y
 * consulta el historial para «Volver a esta versión» (plan §7.2, §6.4).
 */

import { resumirMes } from '@/domain/workbook.ts';
import type { ParsedMonth, ShiftValue, Warning } from '@/domain/types.ts';
import { supabase } from './supabase.ts';

/** Se lanza cuando `publish_import` rechaza por ser idéntico al activo. */
export class SinCambios extends Error {
  constructor() {
    super('No hay cambios desde la última carga.');
    this.name = 'SinCambios';
  }
}

/** No se tiene permiso para publicar (no es admin). */
export class NoAutorizado extends Error {
  constructor() {
    super('No tienes acceso de jefatura para publicar.');
    this.name = 'NoAutorizado';
  }
}

function filaDeTurno(shift: ShiftValue) {
  return {
    raw: shift.raw,
    kind: shift.kind,
    start_min: shift.kind === 'work' ? shift.startMin : null,
    end_min: shift.kind === 'work' ? shift.endMin : null,
  };
}

function payloadDeMes(mes: ParsedMonth) {
  return {
    month: mes.month,
    people: mes.people.map((p) => ({
      key: p.key,
      raw_name: p.rawName,
      display_name: p.displayName,
      joined_on: p.joinedOn,
    })),
    entries: mes.entries.map((e) => ({
      person_key: e.personKey,
      date: e.date,
      department: e.department,
      ...filaDeTurno(e.shift),
    })),
  };
}

export interface PublicarOpciones {
  readonly source: 'excel' | 'sheet';
  readonly sourceLabel: string;
  readonly sheetGid?: string | null;
  readonly contentHash: string;
  readonly months: readonly ParsedMonth[];
  readonly warnings: readonly Warning[];
}

/** Publica una versión nueva. Lanza `SinCambios` o `NoAutorizado` si aplica. */
export async function publicarImport(opts: PublicarOpciones): Promise<string> {
  const payload = {
    source: opts.source,
    source_label: opts.sourceLabel,
    sheet_gid: opts.sheetGid ?? null,
    content_hash: opts.contentHash,
    summary: opts.months.map(resumirMes),
    warnings: opts.warnings,
    months: opts.months.map(payloadDeMes),
  };

  const { data, error } = await supabase.rpc('publish_import', { payload });

  if (error) {
    if (error.message.includes('SIN_CAMBIOS')) throw new SinCambios();
    if (error.message.includes('ADMIN_REQUERIDO')) throw new NoAutorizado();
    throw error;
  }

  return data as string;
}

/** Vuelve a una versión anterior para un mes. */
export async function activarVersion(importId: string, month: string): Promise<void> {
  const { error } = await supabase.rpc('activate_import', { p_import_id: importId, p_month: month });
  if (error) {
    if (error.message.includes('ADMIN_REQUERIDO')) throw new NoAutorizado();
    throw error;
  }
}

export interface VersionActiva {
  readonly month: string;
  readonly importId: string;
  readonly sourceLabel: string;
  readonly activatedAt: string;
}

/** La versión activa de cada mes, para la tarjeta «Fuente actual» (plan §7.2). */
export async function listarVersionesActivas(): Promise<VersionActiva[]> {
  const { data, error } = await supabase
    .from('month_versions')
    .select('month, import_id, activated_at, imports(source_label)')
    .order('month', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((fila) => ({
    month: fila['month'] as string,
    importId: fila['import_id'] as string,
    // PostgREST devuelve un solo objeto para esta relación (month_versions →
    // imports es muchos-a-uno); sin tipos generados, supabase-js no puede
    // saberlo y lo tipa como si pudiera ser un array.
    sourceLabel: (fila['imports'] as unknown as { source_label: string } | null)?.source_label ?? '',
    activatedAt: fila['activated_at'] as string,
  }));
}

export interface VersionHistorial {
  readonly importId: string;
  readonly sourceLabel: string;
  readonly importedAt: string;
  readonly activa: boolean;
}

/** El historial de versiones que cubren `month`, más reciente primero. */
export async function listarHistorialDeMes(month: string): Promise<VersionHistorial[]> {
  const { data: activa, error: e1 } = await supabase
    .from('month_versions')
    .select('import_id')
    .eq('month', month)
    .maybeSingle();
  if (e1) throw e1;

  const { data: imports, error: e2 } = await supabase
    .from('imports')
    .select('id, source_label, imported_at')
    .contains('months', [month])
    .order('imported_at', { ascending: false });
  if (e2) throw e2;

  return (imports ?? []).map((i) => ({
    importId: i['id'] as string,
    sourceLabel: i['source_label'] as string,
    importedAt: i['imported_at'] as string,
    activa: i['id'] === activa?.['import_id'],
  }));
}
