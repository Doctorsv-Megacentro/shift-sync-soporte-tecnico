# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Versionado [SemVer](https://semver.org/lang/es/).

Cada entrada se escribe **en lenguaje de usuario**, con la ficha y el ADR entre paréntesis.

## [Sin publicar]

### Agregado

- Repositorio inicializado con la estructura del plan: andamiaje de Vite + React 19 + TypeScript
  estricto + Tailwind v4, ESLint, Vitest y Playwright, con los scripts `dev`, `check`, `test`, `e2e`
  y `docs:check` (plan §10, Fase 0).
- Integración continua en GitHub Actions: tipos, lint, pruebas, documentación, compilación y
  auditoría de las dependencias de producción. Plantilla de PR con la Definición de terminado.
- `scripts/check-docs.ts`: valida que el índice enlace toda la documentación, que cada carpeta de
  `src/features/` tenga su ficha y que los archivos de dominio y funcionalidades lleven su
  comentario de cabecera (plan §9.3).
- Documentación completa del árbol del plan §9.1: PRD y glosario, Próximamente, visión general de
  la arquitectura, modelo de datos, seguridad, formato de la hoja, catálogo de departamentos, las 16
  reglas de conflicto, tokens de diseño, mapa de pantallas, ficha de carga del horario y siete
  runbooks de operación.
- Doce ADR con las decisiones de arquitectura (ADR-0001 a ADR-0012). ADR-0005 queda **Propuesto**:
  depende de si la Google Sheet puede compartirse por enlace.
- Tokens del sistema de diseño como variables CSS en `src/ui/tokens.css` (plan §8).
- Dominio completo de lectura de la hoja (`src/domain/`: `types`, `config`, `text`, `time`, `shift`,
  `names`, `catalog`, `workbook`, `validate`, `diff`, `presence`) y `src/data/excel.ts` como único
  punto que conoce SheetJS. 189 pruebas (177 con fixtures sintéticos, 12 contra el Excel real de la
  operación) y 99.57 % de cobertura de líneas (ficha: docs/features/carga-horario.md, plan Fase 1).
- `scripts/anonimizar-excel.ts` y `tests/fixtures/horario-anon.xlsx`: el fixture con el que se prueba
  sin usar nombres reales (ADR-0011).
- `tests/local/hoja-real.test.ts` (`npm run test:local`): verifica los criterios de aceptación del
  plan §6.5 contra el Excel real; se salta sola si no existe `referencias/privado/`.
- Demo local de la vista de empleado (`src/features/demo/`): sube un `.xlsx`, busca una persona y
  muestra su semana, su día y quién más trabaja ese día, sin Supabase ni login. Pantalla desechable,
  pedida fuera del plan para validar el dominio antes de la Fase 2 (ADR-0014 **Propuesto**, ficha:
  docs/features/demo.md).

### Corregido

- Un apellido con partícula (`CRUZ DE LEON MARTA`) rompía la regla de reparto nombre/apellido del
  plan §5.5 y producía «De Leon Marta Cruz» en vez de «Marta Cruz de Leon» (ADR-0013 **Propuesto**).

### Seguridad

- `referencias/` queda fuera del control de versiones: contiene las capturas y mockups del diseño
  con nombres y horarios reales, y el Excel de la operación. Antes del cambio, un `git add .` los
  habría publicado (ADR-0011).
- `.gitignore` cubre también `.env*` (salvo `.env.example`) y los `.xlsx` que no sean fixtures.
- Cabeceras de seguridad en `vercel.json` y aviso explícito en `.env.example` de que la clave de
  servicio nunca lleva el prefijo `VITE_`.
- Vitest fijado en `~4.0` y auditoría del CI acotada a las dependencias de producción, que están
  limpias (ADR-0012).
