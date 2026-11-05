/**
 * Crea, lista y revoca enlaces de los cinco alcances. RLS exige jefatura;
 * la lectura pública sigue pasando solo por `get_shared_view`.
 * Ficha: docs/features/compartir.md.
 */

import {
  calcularVencimiento,
  generarSlug,
  prefijoDeAlcance,
  type ShareLinkDraft,
  type ShareParams,
  type ShareScope,
  type Vencimiento,
} from '@/domain/share.ts';
import { supabase } from './supabase.ts';

export interface EnlaceActivo {
  readonly slug: string;
  readonly scope: ShareScope;
  readonly params: ShareParams;
  readonly title: string;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly lastOpenedAt: string | null;
}

export async function crearEnlace(draft: ShareLinkDraft, vencimiento: Vencimiento): Promise<EnlaceActivo> {
  const slug = generarSlug(prefijoDeAlcance(draft.scope));
  const expiresAt = calcularVencimiento(vencimiento).toISOString();
  const { data: sesion } = await supabase.auth.getSession();
  const userId = sesion.session?.user.id;
  if (userId === undefined) throw new Error('SESION_REQUERIDA');

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      slug,
      scope: draft.scope,
      params: draft.params,
      title: draft.title,
      expires_at: expiresAt,
      created_by: userId,
    })
    .select('slug, scope, params, title, expires_at, created_at, last_opened_at')
    .single();
  if (error) throw error;
  return reconstruirEnlace(data as Record<string, unknown>);
}

/** Compatibilidad con la tarjeta mínima de Fuente de datos (Fase 3). */
export async function crearEnlaceOperacion(vencimiento: Vencimiento = 'fin-de-mes'): Promise<EnlaceActivo> {
  return crearEnlace({ scope: 'operacion', params: {}, title: 'Horario de la operación' }, vencimiento);
}

export async function obtenerEnlaceOperacionActivo(): Promise<EnlaceActivo | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('slug, scope, params, title, expires_at, created_at, last_opened_at')
    .eq('scope', 'operacion')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return reconstruirEnlace(data as Record<string, unknown>);
}

export async function listarEnlacesActivos(): Promise<EnlaceActivo[]> {
  const { data, error } = await supabase
    .from('share_links')
    .select('slug, scope, params, title, expires_at, created_at, last_opened_at')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((fila) => reconstruirEnlace(fila as Record<string, unknown>));
}

export async function revocarEnlace(slug: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) throw error;
}

function reconstruirEnlace(fila: Record<string, unknown>): EnlaceActivo {
  return {
    slug: fila['slug'] as string,
    scope: fila['scope'] as ShareScope,
    params: (fila['params'] ?? {}) as ShareParams,
    title: (fila['title'] as string | null) ?? 'Horario compartido',
    expiresAt: fila['expires_at'] as string,
    createdAt: fila['created_at'] as string,
    lastOpenedAt: (fila['last_opened_at'] as string | null) ?? null,
  };
}
