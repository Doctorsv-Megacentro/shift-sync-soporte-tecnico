import { defineConfig } from 'vitest/config';

/**
 * Configuración aparte para `tests/db/`: RLS y RPC contra un stack local de
 * Supabase. Quedan fuera del CI (plan §11) porque necesitan `supabase start`
 * corriendo. Se ejecutan con `npm run test:db`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/db/**/*.test.ts'],
    testTimeout: 15_000,
    // Los archivos comparten la misma base: month_versions tiene un solo
    // renglón por mes, así que dos archivos en paralelo pueden pisarse el
    // mismo mes. Se corren en serie.
    fileParallelism: false,
  },
});
