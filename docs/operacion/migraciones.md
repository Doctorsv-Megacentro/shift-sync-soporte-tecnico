# Runbook — Migraciones de base de datos

Esquema, RLS y RPC viven en `supabase/migrations/`, **una migración por cambio**. Modelo completo:
[../arquitectura/modelo-de-datos.md](../arquitectura/modelo-de-datos.md).

> **Estado: primera migración aplicada y verificada** (`20261104172348_esquema_inicial.sql`), contra
> un stack local (no hay proyecto de desarrollo ni de producción todavía — eso es trabajo de consola
> de Ado, ver §13-3/§13-4 en `docs/progreso.md`).

## El stack local de este repo

`supabase/config.toml` tiene `project_id = "shift-sync"` y los puertos remapeados a **55320–55329**
(no los 54320–54329 por defecto), porque este equipo puede tener otros proyectos Supabase locales
corriendo a la vez. Si `supabase start` falla por un puerto ocupado, revisa qué otro proyecto lo usa
con `docker ps` antes de tocar sus contenedores.

```bash
npx supabase start   # arranca Postgres, Auth, Studio…; aplica las migraciones que haya
npx supabase stop    # apaga solo los contenedores de este proyecto
```

La URL, la clave `anon` y la clave de servicio que imprime `supabase start` son las mismas en
**cualquier** instalación local de Supabase (JWT de demo, públicas y documentadas por Supabase): no
son secretas, pero tampoco sirven para nada fuera de `localhost`. Van en `.env.local` (ignorado por
git), siguiendo [variables-entorno.md](variables-entorno.md).

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

```bash
npx supabase db reset   # reconstruye la base desde cero con todas las migraciones
npm run test:db          # 21 casos: RLS, is_admin, publish_import, activate_import
```

`get_shared_view` se agrega (y se prueba) en la migración de la Fase 3.

## Una lección de la primera migración

Dos errores que **solo aparecieron al aplicar la migración de verdad**, no al leer el SQL:

1. `is_admin()` se usaba en las políticas RLS antes de estar definida en el archivo — Postgres
   aplica las sentencias en orden. Las funciones que usan las políticas van **antes** del bloque RLS.
2. `revoke all on function … from public` no le quita el permiso a `anon`: Supabase da `EXECUTE` a
   `anon` y `authenticated` por defecto en las funciones nuevas del esquema `public`. Hay que revocar
   explícitamente de `anon` (y `authenticated`, antes de volver a dar permiso) en cada función.

Por eso **"probar contra un Postgres de verdad" no es opcional**: ninguna revisión de SQL a ojo
habría encontrado el segundo caso.
