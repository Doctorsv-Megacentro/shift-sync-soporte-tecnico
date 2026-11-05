/**
 * Trae el horario completo (todos los meses activos y los cambios vigentes)
 * para jefatura, vía `get_admin_schedule`. Nunca pasa por `share_links`: es
 * solo para quien ya tiene sesión de admin. Ficha: docs/features/horario.md.
 */

import type { DayOverride } from '@/domain/overlay.ts';
import type { ParsedMonth } from '@/domain/types.ts';
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
