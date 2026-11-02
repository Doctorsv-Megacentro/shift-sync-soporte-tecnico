# 0012 — Vitest fijado en ~4.0 y auditoría acotada a producción

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0002](0002-stack.md), plan §10 Fase 0

## Contexto

Al montar el andamiaje, `npm audit` reportó 15 vulnerabilidades, **todas en dependencias de
desarrollo**: 2 críticas en Vitest y 13 moderadas en las herramientas de lint (`minimatch`,
`typescript-eslint`, `eslint`). `npm audit --omit=dev` reporta **0**: nada de esto llega al paquete
que se despliega.

La crítica relevante es «cuando el servidor de UI de Vitest está escuchando, se puede leer y
ejecutar un archivo arbitrario», corregida en Vitest 4.1.11. Pero **no se puede instalar 4.1.x**:
npm 10.9.2 se rompe al construir el árbol de *peer dependencies* de esa versión, con
`TypeError: Cannot read properties of null (reading 'edgesOut')` en `arborist`.

Hay dos salidas: `legacy-peer-deps=true` en `.npmrc`, que sí instala 4.1.12, o quedarse en 4.0.x.

## Decisión

1. **Vitest y `@vitest/coverage-v8` fijados en `~4.0.0`** (hoy 4.0.18).
2. **No** se activa `legacy-peer-deps`.
3. El CI audita **lo que se despliega**: `npm audit --omit=dev --audit-level=high`.

El proyecto **nunca ejecuta la UI de Vitest**: los scripts son `vitest run` (CI y `npm run check`) y
`vitest` en modo observación. `@vitest/ui` no está instalado y no se pasa `--ui` en ningún sitio, así
que el vector de la crítica no existe en esta configuración.

## Alternativas consideradas

- **`legacy-peer-deps=true` en `.npmrc`** — instala la versión parcheada, pero desactiva la
  validación de *peer dependencies* para **todas** las dependencias del proyecto, para siempre y
  también en CI. Cambia un riesgo acotado y comprobable por uno difuso y permanente.
- **Actualizar npm en el equipo** (npm 11 corrige el fallo de arborist) — es la solución de fondo.
  Se propuso a Ado el 2 nov 2026 y **se decidió no hacerlo por ahora**: toca el host y el riesgo que
  evita no es alcanzable en esta configuración. Queda como mejora pendiente, no como bloqueo. Cuando
  se haga, subir Vitest a `^4.1.12` y marcar este ADR como reemplazado.
- **Ignorar el aviso sin documentarlo** — descartado: un aviso crítico sin explicación obliga a
  reinvestigarlo cada vez.

## Consecuencias

- Lo que llega a producción está limpio y el CI lo comprueba en cada PR.
- Se acepta un riesgo residual en el entorno de desarrollo, condicionado a no usar `vitest --ui`.
  **Si alguien añade la UI de Vitest, este ADR deja de valer** y hay que subir de versión primero.
- Las 13 moderadas de las herramientas de lint quedan abiertas a propósito: su corrección propuesta
  es un cambio mayor de `typescript-eslint` y afectan solo a quien ejecuta el linter.

## Cómo verificarlo

```bash
npm audit --omit=dev          # debe decir: found 0 vulnerabilities
grep -rn "vitest --ui\|@vitest/ui" package.json .github/   # no debe encontrar nada
```

El paso «Auditar dependencias de producción» de `.github/workflows/ci.yml` falla el PR si alguna
dependencia de producción introduce algo de severidad alta o crítica.
