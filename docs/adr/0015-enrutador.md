# 0015 — Enrutador: React Router

- Estado: Aceptado
- Fecha: 2026-11-04
- Relacionado: [ADR-0002](0002-stack.md), plan §4, §7

## Contexto

ADR-0002 dejó el enrutador del navegador sin decidir: «las rutas llegan en la Fase 2 y elegir
librería es una decisión que exige su propio ADR». Esa fase ya necesita rutas de verdad, no
simuladas: `/jefe/fuente` para la pantalla de carga y, a partir de la Fase 3, `/s/:slug` para los
enlaces de empleado, que tienen que funcionar como URLs reales que alguien pega en el navegador o
recibe por WhatsApp.

Son pocas rutas (`/jefe/fuente`, `/jefe/panel`, `/jefe/horario`, `/jefe/compartir`, `/s/:slug`, más
una pantalla de «no tienes acceso»), sin anidamiento profundo: un layout de jefatura con menú lateral
y una vista pública de empleado.

## Decisión

**React Router** (`react-router-dom`, modo declarativo con `<BrowserRouter>`), la opción estándar del
ecosistema React y la que menos fricción tiene con Vite.

## Alternativas consideradas

- **Sin librería, con un `switch` sobre `window.location`** — viable para 5 rutas, pero reinventa
  parámetros de ruta (`:slug`), navegación programática y el manejo del historial del navegador, que
  React Router ya resuelve y prueba.
- **TanStack Router** — más potente (rutas tipadas de punta a punta), pero es más pieza de la que el
  MVP necesita para 5 rutas sin anidamiento complejo.

## Consecuencias

- `App.tsx` pasa a ser el árbol de rutas; la demo local (ADR-0014) se mueve a `/demo` en lugar de
  ocupar la raíz.
- Las rutas de jefatura comparten un layout con el guardián de sesión (¿hay `sesión`? ¿es admin?);
  las rutas públicas (`/s/:slug`) no pasan por ese guardián.
- Es una decisión técnica dentro del stack ya aceptado (ADR-0002), no una regla de negocio: no
  depende de ninguna de las preguntas abiertas del §13.

## Cómo verificarlo

`npm run build` compila sin rutas sueltas; navegar a `/jefe/fuente` sin sesión redirige al login;
navegar a una ruta que no existe muestra un estado controlado, no una pantalla en blanco.
