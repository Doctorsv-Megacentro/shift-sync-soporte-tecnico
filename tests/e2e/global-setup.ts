/**
 * Reconstruye Supabase local y crea la cuenta sintética de jefatura usada
 * por los E2E de Fase 8. Nunca usa datos ni credenciales de producción.
 */

import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:55321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const E2E_EMAIL = 'jefatura-e2e@shiftsync.test';
export const E2E_PASSWORD = 'contrasena-e2e-123';

export default async function globalSetup() {
  execSync('npx supabase start', { stdio: 'inherit' });
  execSync('npx supabase db reset', { stdio: 'inherit' });

  const service = createClient(URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: userError } = await service.auth.admin.createUser({
    email: E2E_EMAIL,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (userError) throw userError;

  const { error: adminError } = await service.from('admins').insert({ email: E2E_EMAIL });
  if (adminError) throw adminError;
}
