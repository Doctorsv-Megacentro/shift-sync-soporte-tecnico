/**
 * Trae el horario completo (todos los meses activos y los cambios vigentes)
 * para jefatura, vía `get_admin_schedule`, y guarda/deshace un cambio de un
 * día (`save_day_override`/`revoke_day_override`, Fase 5). Nunca pasa por
 * `share_links`: es solo para quien ya tiene sesión de admin. Ficha:
 * docs/features/horario.md.
 */

import type { DayOverride } from '@/domain/overlay.ts';
import type { DateKey, ParsedMonth } from '@/domain/types.ts';
import { reconstruirMes, reconstruirOverride, type MesCrudo, type OverrideCrudo } from './meses.ts';
import { supabase } from './supabase.ts';

export interface HorarioCompleto {
  readonly months: readonly ParsedMonth[];
  readonly overrides: readonly DayOverride[];
}

export async function obtenerHorarioCompleto(): Promise<HorarioCompleto> {
  const { data, error } = await supabase.rpc('get_admin_schedule');
  if (error) throw error;

  const cruda = data as { months: readonly MesCrudo[]; overrides: readonly OverrideCrudo[] };
  return {
    months: cruda.months.map(reconstruirMes),
    overrides: cruda.overrides.map(reconstruirOverride),
  };
}

export interface CambioDiaPayload {
  readonly personKey: string;
  readonly date: DateKey;
  readonly kind: 'work' | 'off' | 'vacation';
  readonly startMin: number | null;
  readonly endMin: number | null;
  readonly site: string | null;
  readonly reason: string;
  readonly note: string | null;
  readonly supportPersonKey: string | null;
  /** Clave del conflicto que este cambio resuelve, si se guarda desde el panel. */
  readonly conflictKey?: string | null;
}

/** Guarda un cambio de jefatura para un día. Si ya había uno vigente, lo revoca (plan §7.5). */
export async function guardarCambioDia(payload: CambioDiaPayload): Promise<void> {
  const { error } = await supabase.rpc('save_day_override', {
    payload: {
      person_key: payload.personKey,
      date: payload.date,
      kind: payload.kind,
      start_min: payload.startMin,
      end_min: payload.endMin,
      site: payload.site,
      reason: payload.reason,
      note: payload.note,
      support_person_key: payload.supportPersonKey,
      conflict_key: payload.conflictKey ?? null,
    },
  });
  if (error) throw error;
}

/** «Volver a lo de la hoja» o «Deshacer» del registro de cambios: revoca el cambio vigente. */
export async function deshacerCambioDia(personKey: string, date: DateKey): Promise<void> {
  const { error } = await supabase.rpc('revoke_day_override', { p_person_key: personKey, p_date: date });
  if (error) throw error;
}
