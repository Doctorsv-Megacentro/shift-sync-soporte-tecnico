# 0002 — Stack: React 19 + TypeScript + Vite + Tailwind v4, Supabase y Vercel

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0001](0001-repo-nuevo.md), [ADR-0012](0012-vulnerabilidades-de-desarrollo.md), plan §2.6, §12

## Contexto

El MVP lo mantiene **una sola persona**, con presupuesto **$0** y meta de producción a finales de
noviembre de 2026. Hace falta un stack que ya se haya probado en este dominio y que quepa entero en
capas gratuitas.

## Decisión

- **Navegador:** React 19 + TypeScript estricto + Vite + Tailwind v4 (`@tailwindcss/vite`).
- **Datos:** Supabase — Postgres con RLS, Auth con Google y funciones RPC.
- **Despliegue:** Vercel — sitio estático más funciones en `/api`.
- **Lectura de Excel:** SheetJS desde `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, porque
  la versión publicada en npm está desactualizada (igual que en v1).

## Alternativas consideradas

- **Next.js + Prisma** (ADR-001/002 del PRD anterior) — más piezas de las que el MVP necesita. RLS y
  RPC de Supabase ya cubren el acceso a datos sin una capa ORM ni un servidor propio.
- **SheetJS desde npm** — desactualizado respecto al CDN del proyecto.

## Consecuencias

- Es el stack que ya funcionó en v1, así que el riesgo técnico es conocido.
- Todo cabe en capas gratuitas. Si una pieza futura no cabe, se discute en un ADR antes de usarla.
- Se acepta depender de un tarball por URL para SheetJS: queda fijado en `package-lock.json`.
- **Aún sin decidir:** el enrutador del navegador. Las rutas llegan en la Fase 2 y elegir librería
  es una decisión que exige su propio ADR (plan §9.2).

## Cómo verificarlo

`npm run check` y `npm run build` pasan en local y en CI. `npm audit --omit=dev` no reporta
vulnerabilidades en lo que se despliega.
