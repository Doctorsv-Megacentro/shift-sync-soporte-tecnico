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

### Seguridad

- `referencias/` queda fuera del control de versiones: contiene las capturas y mockups del diseño
  con nombres y horarios reales, y el Excel de la operación. Antes del cambio, un `git add .` los
  habría publicado (ADR-0011).
- `.gitignore` cubre también `.env*` (salvo `.env.example`) y los `.xlsx` que no sean fixtures.
- Cabeceras de seguridad en `vercel.json` y aviso explícito en `.env.example` de que la clave de
  servicio nunca lleva el prefijo `VITE_`.
- Vitest fijado en `~4.0` y auditoría del CI acotada a las dependencias de producción, que están
  limpias (ADR-0012).
