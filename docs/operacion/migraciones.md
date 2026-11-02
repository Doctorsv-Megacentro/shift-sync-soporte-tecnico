# Runbook — Migraciones de base de datos

Esquema, RLS y RPC viven en `supabase/migrations/`, **una migración por cambio**. Modelo completo:
[../arquitectura/modelo-de-datos.md](../arquitectura/modelo-de-datos.md).

> **Estado: sin migraciones todavía.** La primera llega en la **Fase 2**.

## La regla de oro

**Las migraciones se aplican a mano y ANTES de mergear el PR que las necesita.** Si el código llega
a producción antes que el esquema, la aplicación se rompe.

## Crear una migración

```bash
supabase migration new descripcion_corta
# editar supabase/migrations/<timestamp>_descripcion_corta.sql
```

Toda migración debe incluir, en comentarios al final, **cómo deshacerla**. No se escribe un archivo
de *rollback* automático: se documenta el SQL inverso para poder ejecutarlo a mano.

Cada migración nueva:

- activa RLS en cualquier tabla que cree (`alter table … enable row level security`);
- **no** da política de lectura a `anon` en ninguna tabla;
- si crea una RPC, la declara `security definer` **con `search_path` fijo**.

## Aplicar

```bash
# 1. Local, contra el stack de desarrollo
supabase start
supabase db reset          # reconstruye desde cero con todas las migraciones

# 2. Desarrollo (remoto)
supabase link --project-ref <ref-desarrollo>
supabase db push

# 3. Producción, solo cuando el PR está aprobado
supabase link --project-ref <ref-produccion>
supabase db push
```

## Orden de un cambio que toca la base

1. Escribir la migración y probarla con `supabase db reset` en local.
2. Actualizar `modelo-de-datos.md` **en el mismo PR**.
3. Aplicarla en el proyecto de desarrollo y comprobar que el *preview* del PR funciona.
4. Aplicarla en producción.
5. Mergear.

Saltarse el paso 2 incumple la Definición de terminado.

## Volver atrás

Ejecutar a mano el SQL inverso documentado en la migración. Si el cambio ya tiene datos encima, hay
que decidir qué pasa con ellos **antes** de ejecutarlo: ver [volver-atras.md](volver-atras.md).

## Cómo verificarlo

`supabase db reset` reconstruye la base desde cero sin errores. `tests/db/` pasa: `anon` no lee
ninguna tabla, un no admin no puede escribir, y `get_shared_view` respeta alcance y vencimiento.
