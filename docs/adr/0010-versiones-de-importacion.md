# 0010 — Versiones de importación: publicar crea una versión y se puede volver atrás

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0003](0003-cambios-como-capa.md), plan §6.4, §12

## Contexto

Recargar la hoja es la acción más frecuente de jefatura: coordinación la ajusta durante el mes y
hay que volver a leerla. Si cada carga sobrescribe los datos, una hoja mal armada deja la operación
sin horario y sin forma de recuperarlo.

## Decisión

Cada publicación crea una **versión** (una fila en `imports`). Cada mes apunta a su **versión
activa** en `month_versions`, y se puede volver a una anterior con «Volver a esta versión»
(`activate_import`).

Además, se calcula un `content_hash` del libro: si es idéntico al de la versión activa, se avisa
«No hay cambios desde la última carga» y **no se publica**.

## Alternativas consideradas

- **Sobrescribir los datos** — simple, pero sin vuelta atrás en producción. Es justo lo que hace
  falta cuando alguien publica la hoja equivocada.

## Consecuencias

- Hay una vía de recuperación de datos independiente del despliegue: los datos se revierten desde
  Fuente, el código desde el *Instant Rollback* de Vercel, y la base con la migración inversa.
- Volver a una versión anterior cambia lo que ven el panel, el horario y los enlaces, porque todos
  leen la versión activa del mes.
- Los **cambios de jefatura sobreviven** a cambiar de versión: viven en `day_overrides`, indexados
  por `person_id + date`, no por importación (ADR-0003).
- Se acepta que las importaciones se acumulen. `schedule_entries` tiene clave primaria
  `(import_id, person_id, date)`; si el volumen molesta, se purga por antigüedad en un runbook.

## Cómo verificarlo

Publicar dos veces el mismo archivo **no** crea otra versión. Volver a una versión anterior cambia
lo que muestran panel, horario y enlaces. Ambos son criterios de aceptación del plan §6.5.
