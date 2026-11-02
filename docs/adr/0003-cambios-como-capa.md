# 0003 — Los cambios de jefatura son una capa sobre el horario importado

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0007](0007-conflictos-como-funciones-puras.md), [ADR-0010](0010-versiones-de-importacion.md), plan §2.1, §5.6, §7.5

## Contexto

La hoja mensual la arma coordinación y **no se puede tocar**: ni con Apps Script ni con extensiones.
Pero jefatura necesita cambiar el día de una persona (turno, sede, apoyo) y que ese cambio lo vean
todos, no solo quien lo hizo.

En v1 esto existía como `src/lib/overrides.ts` sobre `localStorage`: el cambio vivía en un único
navegador y se perdía al limpiar el almacenamiento.

## Decisión

La hoja es la fuente de verdad y **nunca se escribe en ella**. Los cambios de jefatura son filas en
`day_overrides`, una capa en Postgres que se aplica encima del horario leído. El horario efectivo
que ve todo el mundo es `hoja + cambios` (`src/domain/overlay.ts`).

Deshacer un cambio es poner `revoked_at`. Editarlo es revocar el vigente e insertar uno nuevo, de
modo que el historial queda completo.

## Alternativas consideradas

- **Escribir en la hoja** — descartado: no hay permiso para modificarla y rompería el trabajo de
  coordinación.
- **Guardar el horario ya mezclado** — obliga a recalcular y re-guardar todo en cada recarga de la
  hoja, y deja los datos desincronizados cuando algo falla a medias.

## Consecuencias

- Los cambios **sobreviven a recargar la hoja**, porque se guardan por `person_id + date` y no por
  nombre.
- Aparecen dos situaciones nuevas que el panel resuelve como conflictos (plan §6.4): la hoja nueva
  ya trae el valor del cambio (`cambio-ya-en-hoja`, baja) y la persona ya no está en la hoja
  (`cambio-huerfano`, media).
- Índice único parcial sobre `(person_id, date) where revoked_at is null`: una persona no puede
  tener dos cambios vigentes el mismo día.

## Cómo verificarlo

Prueba de `overlay.ts`: dado un horario y un cambio vigente, el día efectivo es el del cambio; si se
revoca, vuelve a ser el de la hoja y ambos registros siguen en el historial. En la Fase 5, el E2E
cubre guardar → ver como empleado → deshacer.
