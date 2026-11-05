/**
 * Apaga únicamente el stack Supabase local de ShiftSync después de E2E.
 * Ficha operativa: docs/operacion/despliegue.md.
 */

import { execSync } from 'node:child_process';

export default function globalTeardown() {
  if (process.env['E2E_KEEP_SUPABASE'] === '1') return;
  execSync('npx supabase stop', { stdio: 'inherit' });
}
