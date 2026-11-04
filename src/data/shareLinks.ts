/**
 * Crear, consultar y revocar el enlace de «toda la operación» (plan §7.6,
 * alcance mínimo de la Fase 3). Acceso directo a `share_links`: RLS ya exige
 * ser admin, así que no hace falta una RPC aparte para esto.
 */

import { calcularVencimiento, generarSlug, type Vencimiento } from '@/domain/share.ts';
import { supabase } from './supabase.ts';

export interface EnlaceActivo {
  readonly slug: string;
  readonly expiresAt: string;
}

/** Crea el enlace de la operación completa. Vencimiento por defecto: fin de mes (plan §7.2 Fase 3). */
export async function crearEnlaceOperacion(vencimiento: Vencimiento = 'fin-de-mes'): Promise<EnlaceActivo> {
  const slug = generarSlug('operacion');
  const expiresAt = calcularVencimiento(vencimiento).toISOString();
  const { data: sesion } = await supabase.auth.getSession();

  const { error } = await supabase.from('share_links').insert({
    slug,
    scope: 'operacion',
    params: {},
    expires_at: expiresAt,
    created_by: sesion.session?.user.id,
  });
  if (error) throw error;

  return { slug, expiresAt };
}

/** El enlace de operación vigente más reciente, o `null` si no hay ninguno. */
export async function obtenerEnlaceOperacionActivo(): Promise<EnlaceActivo | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('slug, expires_at')
    .eq('scope', 'operacion')
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { slug: data['slug'] as string, expiresAt: data['expires_at'] as string };
}

export async function revocarEnlace(slug: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('slug', slug);
  if (error) throw error;
}
