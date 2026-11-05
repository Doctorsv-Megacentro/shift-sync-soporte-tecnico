/**
 * Lectura del panel: el horario de jefatura más los «aceptado como está».
 * Guardar un conflicto aceptado, deshacerlo y fijar el nombre manual.
 * Ficha: docs/features/panel.md.
 */

import type { AckConflicto } from '@/domain/conflicts/types.ts';
import type { DayOverride } from '@/domain/overlay.ts';
import type { ParsedMonth } from '@/domain/types.ts';
import { reconstruirMes, reconstruirOverride, type MesCrudo, type OverrideCrudo } from './meses.ts';
import { supabase } from './supabase.ts';

export interface DatosPanel {
  readonly months: readonly ParsedMonth[];
  readonly overrides: readonly DayOverride[];
  readonly acks: readonly AckConflicto[];
}

interface AckCrudo {
  readonly conflictKey: string;
  readonly note: string | null;
}

/** Horario completo y acks vigentes. Misma RPC que el horario, con `acks`. */
export async function obtenerDatosPanel(): Promise<DatosPanel> {
  const { data, error } = await supabase.rpc('get_admin_schedule');
  if (error) throw error;

  const cruda = data as {
    months: readonly MesCrudo[];
    overrides: readonly OverrideCrudo[];
    acks?: readonly AckCrudo[];
  };
  return {
    months: cruda.months.map(reconstruirMes),
    overrides: cruda.overrides.map(reconstruirOverride),
    acks: (cruda.acks ?? []).map((ack) => ({ conflictKey: ack.conflictKey, note: ack.note })),
  };
}

/** «Aceptar como está»: una fila en `conflict_acks`. Si ya había una, la revoca. */
export async function aceptarConflicto(conflictKey: string, note: string | null): Promise<void> {
  const { error } = await supabase.rpc('ack_conflict', { p_key: conflictKey, p_note: note });
  if (error) throw error;
}

/** Deshacer un «aceptado como está». */
export async function deshacerAceptacion(conflictKey: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_conflict_ack', { p_key: conflictKey });
  if (error) throw error;
}

/** Chips «Nombre primero» / «Apellido primero». */
export async function guardarNombreManual(personKey: string, displayName: string): Promise<void> {
  const { error } = await supabase.rpc('set_person_display_name', { p_key: personKey, p_name: displayName });
  if (error) throw error;
}
