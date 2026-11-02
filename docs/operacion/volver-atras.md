# Runbook — Volver atrás

Tres cosas pueden salir mal y cada una se revierte por su lado. **Identificar cuál es, primero.**

| Síntoma | Qué falló | Sección |
|---|---|---|
| Los horarios son los del mes equivocado, o faltan personas | **Datos** | [1](#1-datos) |
| La aplicación da error o una pantalla quedó rota tras un despliegue | **Código** | [2](#2-código) |
| Error de base de datos: columna o función que no existe | **Esquema** | [3](#3-esquema) |

## 1. Datos

La vuelta atrás más frecuente: se publicó la hoja equivocada.

1. Entrar en **Fuente de datos** (`/jefe/fuente`).
2. En el **historial de versiones**, localizar la versión correcta por fecha y origen.
3. Pulsar **«Volver a esta versión»**.

Efecto inmediato: panel, horario completo y todos los enlaces activos pasan a mostrar esa versión.
**Los cambios de jefatura no se pierden**: viven en `day_overrides`, indexados por persona y fecha,
no por importación ([ADR-0010](../adr/0010-versiones-de-importacion.md)).

No hace falta desplegar ni tocar la base.

## 2. Código

1. Vercel → el proyecto → **Deployments**.
2. Localizar el despliegue anterior que funcionaba.
3. **Instant Rollback**.

Es inmediato y no toca la base de datos. **Ojo:** si el despliegue que se revierte traía una
migración, el esquema sigue migrado. Normalmente no es un problema (las migraciones añaden), pero si
el código anterior es incompatible con el esquema nuevo, hay que revertir también el esquema.

## 3. Esquema

1. Abrir la migración culpable en `supabase/migrations/`.
2. Ejecutar a mano el **SQL inverso documentado al final del archivo**.
3. Si el cambio ya tiene datos encima, decidir qué pasa con ellos **antes** de ejecutar nada:
   ¿se descartan, se copian a otro sitio?
4. Anotar lo ocurrido en [incidentes.md](incidentes.md).

Ver [migraciones.md](migraciones.md).

## Deshacer un cambio de jefatura

No es una vuelta atrás de producción, es una función del producto: en el **Registro de cambios**,
«Deshacer». El día vuelve a lo que dice la hoja y **el historial conserva ambos registros**
(el cambio queda con `revoked_at`).

## Revocar un enlace

En **Compartir**, «Revocar». A partir de ese momento el enlace muestra «Este enlace ya no está
activo. Pide uno nuevo a jefatura.». No se puede reactivar: se crea uno nuevo.

## Cómo verificarlo

Después de cualquier vuelta atrás: cargar el panel del día de hoy, abrir un enlace de empleado
vigente y comprobar que un cambio de jefatura reciente sigue visible.
