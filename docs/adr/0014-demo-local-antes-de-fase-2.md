# 0014 — Demo local de la vista de empleado, antes de la Fase 2

- Estado: **Propuesto**
- Fecha: 2026-11-02
- Relacionado: [ADR-0001](0001-repo-nuevo.md), [ADR-0004](0004-un-solo-camino-de-lectura.md), plan §10, docs/features/demo.md

## Contexto

El plan construye la vista de empleado en la Fase 3, después de montar Supabase, el login de
jefatura y la Fuente de datos (Fase 2). Eso significa que el primer momento en el que alguien fuera
de esta sesión puede *ver* el producto con datos reales llega después de ~5-6 días de trabajo de
infraestructura.

Con el dominio de la Fase 1 ya terminado y probado —`workbook.ts`, `presence.ts`, `names.ts`,
`catalog.ts`— casi todo lo necesario para pintar la vista de empleado ya existe. Lo único que falta
es una pantalla.

Ado pidió explícitamente construir esta demo ahora, antes de seguir con la Fase 2.

## Decisión

Una pantalla, `src/features/demo/`, que:

- lee un `.xlsx` **en el navegador** con `src/data/excel.ts` (el mismo código que usará la Fuente de
  datos real);
- interpreta el libro con `domain/workbook.ts` y pinta buscador, semana, tarjeta del día y «quién
  está ese día» con `domain/presence.ts`;
- **no usa Supabase, no tiene login, no genera enlaces** y no conoce `day_overrides` (no hay base de
  datos): todo el estado vive en memoria del navegador y desaparece al recargar.

Se monta directamente en `App.tsx`, con un aviso visible de que es una demo y no la Fase 3.

## Por qué es una desviación y por qué se acepta

El plan §10 ordena una fase por sesión y la vista de empleado depende, en el plan, de la Fase 2. Esta
demo adelanta la *interfaz* sin adelantar la *infraestructura*, así que:

- **No sustituye a la Fase 3.** La Fase 3 trae `get_shared_view`, el alcance de los enlaces, el
  `overlay.ts` (hoja + cambios de jefatura) y la fidelidad visual completa a las capturas 01-04. Esta
  demo es deliberadamente más simple: sin pixel-perfect, sin los textos exactos del mockup en cada
  rincón, sin `localStorage`, sin distinguir «soy yo» de «estoy mirando a otra persona» con la
  persistencia que describe el plan §7.1 (aquí ambas cosas conviven en memoria con «Volver a mi
  horario»).
- **El código que sí es real se reutiliza tal cual.** `src/data/excel.ts` y todo `src/domain/` no se
  tiran: la Fase 3 los usa sin cambios. Lo único desechable es `src/features/demo/`.
- **El valor es validar antes de construir infraestructura.** Jefatura puede abrir la demo, buscar su
  nombre, ver su semana y probar «quién está ese día» con el Excel real, y decir si los nombres se
  leen bien o si la función es útil, **antes** de gastar los 3 días de la Fase 2.

## Alternativas consideradas

- **Seguir el orden del plan al pie de la letra** — es lo seguro, pero Ado pidió explícitamente ver
  algo funcionando ahora. Sin esta demo, el primer entregable visible llega con la Fase 3 completa.
- **Maquetar con datos inventados en vez de leer el Excel** — más rápido, pero no prueba nada del
  parser ni de los nombres reales, que es justo lo que más incertidumbre tiene.

## Consecuencias

- `src/features/demo/` se documenta como cualquier otra carpeta de features (ficha obligatoria,
  `docs:check` lo exige), pero queda marcada como desechable: desaparece cuando la Fase 3 construya
  la vista de empleado real.
- No hay pruebas automatizadas de `src/features/demo/`: es UI de usar y tirar, no lógica de dominio.
  Se verificó a mano en el navegador (ver docs/features/demo.md, «Cómo se probó»).
- `App.tsx` monta la demo en lugar de un esqueleto vacío. Cuando empiece la Fase 2, `App.tsx` vuelve
  a ser la cáscara con rutas reales y la demo se retira.

## Cómo verificarlo

Ejecutar `npm run dev`, subir `tests/fixtures/horario-anon.xlsx`, buscar un nombre, ver la semana, un
día libre y un día con turno, y comprobar que «quién está ese día» lista personas reales del fixture
en sus tres alcances (con «Mismo horario» deshabilitado en un día libre, tal como pide el plan §7.1).
