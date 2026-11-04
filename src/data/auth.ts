/**
 * Sesión de jefatura: entrar y salir con Google, y saber si el correo de la
 * sesión está en `admins` (ADR-0006). La configuración del proveedor Google
 * en Supabase Auth es un paso externo: docs/operacion/variables-entorno.md.
 */

import { supabase } from './supabase.ts';

/** Abre el flujo de Google. Redirige fuera de la página; no hay valor de vuelta. */
export async function iniciarSesionConGoogle(): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/jefe/fuente` },
  });
  if (error) throw error;
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** ¿El correo de la sesión actual está en `admins`? */
export async function esAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}
