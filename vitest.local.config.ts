import { defineConfig } from 'vitest/config';

/**
 * Configuración aparte para `tests/local/`: pruebas contra el Excel real de
 * la operación. Quedan fuera del CI (plan §11) porque dependen de
 * `referencias/privado/`, que nunca se commitea. Se ejecutan con
 * `npm run test:local`.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/local/**/*.test.ts'],
  },
});
