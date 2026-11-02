# 0001 — Repo nuevo; el anterior queda como referencia de solo lectura

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0011](0011-datos-personales-fuera-del-repo.md), plan §0, §6.1

## Contexto

Existe una v1 en producción (`shiftsync-rho-neon.vercel.app`, repo
`JAPEREZ-L001/ShiftSync`) construida para **un usuario** que sincronizaba su turno con Google
Calendar. El alcance de v2 es otro: una operación de ~100 personas con **dos roles** (empleado y
jefatura), conflictos, cambios de jefatura y enlaces para compartir.

Arrastrar el código de v1 mezcla los dos modelos. Su `useSchedule.ts` concentra 435 líneas de
estado, el login es simulado con PIN y no hay pruebas. Pero el parser del Excel sí funciona y vale
la pena entenderlo.

## Decisión

Repositorio nuevo: `Doctorsv-Megacentro/shift-sync-soporte-tecnico`. El repo de v1 se clona en
`referencias/legado/` **solo para leerlo**. No se copian archivos: se reescribe tomando la idea y
se cita el origen en la ficha de la funcionalidad.

## Alternativas consideradas

- **Reiniciar el repo actual en una rama** — mantiene el historial y los enlaces existentes, pero
  conserva dependencias y estructura pensadas para otro producto, y el repo de v1 es público con
  datos sensibles en su historial.

## Consecuencias

- Se gana un árbol limpio con la estructura del plan §4 y la separación dominio / datos / UI.
- Se acepta perder el historial de v1, que queda consultable en su propio repo.
- Riesgo: duplicar esfuerzo al reescribir el parser. Se mitiga con el mapeo explícito del plan §6.1,
  que dice qué idea tomar de cada archivo de v1 y qué cambia en v2.
- Queda pendiente el **corte con v1** (cuándo se apaga y qué pasa con los enlaces `?s=<uuid>` ya
  repartidos): ver `docs/progreso.md`, bloqueo 3, y plan Fase 8.

## Cómo verificarlo

`git log` del repo nuevo empieza en la Fase 0. `referencias/` está en `.gitignore`, así que el clon
de v1 nunca entra al repo: `git check-ignore -v referencias/legado` lo confirma.
