# Runbook — Respaldo

> **Estado: pendiente de montar.** Se cierra en la **Fase 8**.

## Qué hay que respaldar y qué no

| Dato | ¿Respaldo? | Por qué |
|---|---|---|
| `day_overrides` | **Sí, crítico** | Es el trabajo de jefatura. **No se puede reconstruir desde la hoja**: la hoja no los tiene |
| `conflict_acks` | **Sí** | Decisiones tomadas («aceptado como está») con su nota |
| `people` con `display_name_source='manual'` | **Sí** | Correcciones manuales de nombres que se respetan en cada importación |
| `share_links` | Sí | Enlaces repartidos y vigentes |
| `admins` | Sí | Es corta, pero sin ella nadie entra |
| `imports` y `schedule_entries` | Conveniente | Se pueden reconstruir volviendo a cargar la hoja, si se conserva el archivo |

**La conclusión que importa:** si se pierde la base, el horario se recupera cargando la hoja otra
vez, pero **los cambios de jefatura se pierden para siempre**. Son lo primero que hay que respaldar.

## Respaldo manual

```bash
supabase link --project-ref <ref-produccion>
supabase db dump -f respaldo-$(date +%F).sql
```

Guardarlo **fuera del repositorio**: contiene nombres reales
([ADR-0011](../adr/0011-datos-personales-fuera-del-repo.md)). Nunca en `docs/` ni en ninguna ruta
rastreada por git.

## Frecuencia propuesta

| Cuándo | Qué |
|---|---|
| Antes de cada migración de producción | `db dump` completo |
| Mensual, al cargar el mes nuevo | `db dump` completo |
| Tras una tanda grande de cambios de jefatura | Al menos las tablas críticas |

Automatizarlo requiere un cron y un sitio donde guardarlo. Con presupuesto $0, se hace a mano
siguiendo esta lista hasta que haya una decisión (ADR) sobre dónde almacenarlo.

## Restaurar

```bash
psql "<cadena-de-conexion>" -f respaldo-AAAA-MM-DD.sql
```

Probar la restauración **en el proyecto de desarrollo** antes de necesitarla de verdad. Un respaldo
que nunca se ha restaurado no es un respaldo.

## Cómo verificarlo

Restaurar el último `dump` en el proyecto de desarrollo y comprobar que `day_overrides` tiene el
número de filas esperado y que la aplicación arranca contra esa base.
