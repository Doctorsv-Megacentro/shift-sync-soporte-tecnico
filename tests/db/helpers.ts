/**
 * Ayudas para las pruebas de base de datos: crean usuarios de prueba contra
 * el stack local de Supabase y devuelven clientes autenticados. Solo se usa
 * en `tests/db/`, nunca en producción.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env['SUPABASE_URL'] ?? 'http://127.0.0.1:55321';
const ANON_KEY =
  process.env['SUPABASE_ANON_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/** Cliente `anon`, el mismo nivel de acceso que tiene el navegador sin sesión. */
export function clienteAnon(): SupabaseClient {
  return createClient(URL, ANON_KEY);
}

/** Cliente con la clave de servicio. Salta RLS: solo para montar el escenario. */
export function clienteServicio(): SupabaseClient {
  return createClient(URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let contador = 0;

/**
 * Crea un usuario de prueba, confirmado, y devuelve un cliente autenticado
 * como ese usuario (el nivel de acceso real de alguien que inició sesión).
 */
export async function crearUsuarioAutenticado(opts?: {
  admin?: boolean;
}): Promise<{ email: string; cliente: SupabaseClient }> {
  contador += 1;
  const email = `prueba-${Date.now()}-${contador}@shiftsync.test`;
  const password = 'contrasena-de-prueba-123';

  const servicio = clienteServicio();
  const { error: errorCrear } = await servicio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (errorCrear) throw errorCrear;

  if (opts?.admin === true) {
    const { error: errorAdmin } = await servicio.from('admins').insert({ email });
    if (errorAdmin) throw errorAdmin;
  }

  const cliente = createClient(URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: errorLogin } = await cliente.auth.signInWithPassword({ email, password });
  if (errorLogin) throw errorLogin;

  return { email, cliente };
}

/** Nombre de las tablas que solo jefatura puede leer o escribir. */
export const TABLAS_SOLO_ADMIN = [
  'admins',
  'imports',
  'month_versions',
  'people',
  'schedule_entries',
  'day_overrides',
  'conflict_acks',
  'share_links',
] as const;
