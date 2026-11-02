# ShiftSync v2

Lee el horario mensual de la operación (Excel o Google Sheet: ~100 personas, 26 departamentos,
7 sedes) y lo muestra a dos públicos.

| Público | Qué puede hacer en el MVP | Cómo entra |
|---|---|---|
| **Empleado** | Buscar su nombre, ver su semana y su día, ver quién está ese día (mismo horario / su equipo / toda la operación) y si jefatura le cambió un día | Enlace de solo lectura que comparte jefatura. Sin cuenta |
| **Jefatura** | Cargar el horario, revisar y resolver **conflictos**, ver el horario completo, **cambiar un día** (turno, sede, apoyo, motivo y nota), deshacer cambios y generar enlaces para compartir | Google (Supabase Auth) + lista de correos permitidos |

La idea de fondo: **la hoja es la fuente de verdad y nunca se escribe en ella.** Los cambios de
jefatura son una capa guardada en la base que se aplica encima del horario leído.

## Estado

**En construcción.** La Fase 0 (andamiaje y documentación) está cerrada; las pantallas se construyen
de la Fase 2 a la 7. Estado al día en [`docs/progreso.md`](docs/progreso.md).

## Empezar

Requiere **Node 20.19 o superior** (probado con 22).

```bash
npm install
cp .env.example .env.local   # y rellenar los valores
npm run dev                  # http://localhost:5173
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run check` | **Tipos + lint + pruebas.** Es la puerta de entrada de cualquier PR |
| `npm run test` | Pruebas unitarias (Vitest) |
| `npm run test:cov` | Cobertura de `src/domain` |
| `npm run e2e` | End-to-end (Playwright). La primera vez: `npx playwright install` |
| `npm run docs:check` | Valida el índice, las fichas y las cabeceras de archivo |
| `npm run build` | Compila a `dist/` |

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `src/domain/` | Las reglas de negocio. TypeScript puro: **sin React ni Supabase**, y siempre con pruebas |
| `src/data/` | Acceso a Supabase (consultas y RPC), sin lógica de negocio |
| `src/features/` | Una carpeta por pantalla |
| `src/ui/` | Componentes base y `tokens.css` |
| `src/app/` | Rutas, sesión y layouts |
| `api/` | Funciones de Vercel |
| `supabase/migrations/` | Esquema, RLS y RPC |
| `docs/` | Toda la documentación. Empieza por [`docs/00-indice.md`](docs/00-indice.md) |
| `referencias/` | Diseño aprobado, Excel real y clon de v1. **No está en el repo** |

Las dependencias no suben de capa: `src/domain` no sabe que existen React, Supabase ni las
pantallas. El linter lo hace cumplir.

## Stack

React 19 + TypeScript estricto + Vite + Tailwind v4 · Supabase (Postgres con RLS, Auth, RPC) ·
Vercel (sitio estático y funciones `/api`) · SheetJS para leer el Excel. Todo dentro de capas
gratuitas ([ADR-0002](docs/adr/0002-stack.md)).

## Documentación

- [`docs/00-indice.md`](docs/00-indice.md) — índice: «si quieres saber X → mira Y».
- [`docs/progreso.md`](docs/progreso.md) — fase actual, siguiente paso y preguntas abiertas.
- [`docs/plan-implementacion.md`](docs/plan-implementacion.md) — el plan completo. Documento vivo.
- [`docs/producto/prd.md`](docs/producto/prd.md) — alcance y glosario.
- [`docs/adr/`](docs/adr/) — las decisiones, con su contexto y sus alternativas.
- [`CLAUDE.md`](CLAUDE.md) — reglas de trabajo para Claude Code.

## Datos personales

`referencias/` está en `.gitignore` y **no se commitea**: contiene capturas, mockups y el Excel real
con nombres y horarios de la operación. En el repo solo entran fixtures sintéticos o anonimizados
(`tests/fixtures/`), generados con `scripts/anonimizar-excel.ts`. Ver
[ADR-0011](docs/adr/0011-datos-personales-fuera-del-repo.md).
