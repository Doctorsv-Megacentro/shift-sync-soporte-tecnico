/**
 * Llama a la RPC pública `get_shared_view` y convierte su jsonb a los tipos
 * del dominio, para que la pantalla de empleado reutilice `domain/presence.ts`
 * y `domain/overlay.ts` tal cual. Ficha: docs/features/empleado.md.
 */

import type { DayOverride } from '@/domain/overlay.ts';
import type { ShareParams, ShareScope } from '@/domain/share.ts';
import type { ParsedMonth } from '@/domain/types.ts';
import { reconstruirMes, reconstruirOverride, type MesCrudo, type OverrideCrudo } from './meses.ts';
import { supabase } from './supabase.ts';

export interface FuenteInfo {
  readonly source: 'excel' | 'sheet';
  readonly sourceLabel: string;
  readonly importedAt: string;
}

interface VistaCruda {
  readonly scope: ShareScope;
  readonly params: ShareParams;
  readonly title: string | null;
  readonly source: FuenteInfo | null;
  readonly months: readonly MesCrudo[];
  readonly overrides: readonly OverrideCrudo[];
}

export interface VistaCompartida {
  readonly scope: ShareScope;
  readonly params: ShareParams;
  readonly title: string | null;
  readonly source: FuenteInfo | null;
  readonly months: readonly ParsedMonth[];
  readonly overrides: readonly DayOverride[];
}

export type ResultadoVista =
  | { tipo: 'inactivo' }
  | { tipo: 'ok'; vista: VistaCompartida };

/** Pide la vista pública de un enlace. Nunca lanza: el estado va en el resultado. */
export async function obtenerVistaCompartida(slug: string): Promise<ResultadoVista> {
  const { data, error } = await supabase.rpc('get_shared_view', { p_slug: slug });
  if (error) throw error;

  const cruda = data as VistaCruda | { error: string };
  if ('error' in cruda) {
    return { tipo: 'inactivo' };
  }

  return {
    tipo: 'ok',
    vista: {
      scope: cruda.scope,
      params: cruda.params ?? {},
      title: cruda.title,
      source: cruda.source,
      months: cruda.months.map(reconstruirMes),
      overrides: cruda.overrides.map(reconstruirOverride),
    },
  };
}
