import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    // La Fase 0 todavía no tiene lógica de dominio. La Fase 1 escribe las
    // primeras pruebas y quita esta línea.
    passWithNoTests: true,
    // Las pruebas de dominio son TS puro. Las de base de datos (tests/db) y las
    // locales con el Excel real (tests/local) quedan fuera del CI: plan §11.
    include: ['tests/domain/**/*.test.ts', 'tests/**/*.unit.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**'],
      // Plan Fase 1: cobertura de src/domain >= 90 % de lineas.
      thresholds: { lines: 90 },
    },
  },
});
