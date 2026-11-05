# Runbook — Despliegue

Fuente: plan §12.

## Entornos

| Entorno | Sitio | Base de datos | Se despliega desde |
|---|---|---|---|
| Local | `npm run dev` (`localhost:5173`) | Supabase CLI local | — |
| *Preview* | Vercel, una URL por PR | Supabase de desarrollo | cada push a una rama con PR |
| *Production* | Vercel | Supabase de **producción** | `main` |

**Estado al 2026-11-04:** hay un proyecto de **pruebas**, no el corte de producción.

| Pieza | Qué es |
|---|---|
| Supabase | `shift-sync` · ref `tuemfuocmrysmtmfjqkk` · región `us-east-1` · cuenta «Adonys Projects», junto a `delirium-hub`. Las 6 migraciones ya están aplicadas |
| Vercel | Proyecto nuevo `shift-sync-soporte` en el equipo personal (plan Hobby). El proyecto `shiftsync` de v1 no se toca |
| Git | [Doctorsv-Megacentro/shift-sync-soporte-tecnico](https://github.com/Doctorsv-Megacentro/shift-sync-soporte-tecnico), público, conectado a `shift-sync-soporte`. El plan Hobby no admite un repo privado de una organización |

Las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` ya están en Production, Preview y Development de
`shift-sync-soporte`. `.env.local` apunta a este mismo proyecto de pruebas.

## Qué es público

**Solo `get_shared_view` con un slug válido y vigente.** Todo lo demás requiere sesión de jefatura.
Ver [../arquitectura/seguridad.md](../arquitectura/seguridad.md).

## Desplegar

1. Crear proyectos Supabase separados para desarrollo y producción y aplicar las migraciones
   siguiendo [migraciones.md](migraciones.md).
2. Crear un proyecto Vercel nuevo conectado a este repositorio; no enlazarlo al proyecto de v1 ni
   al proyecto que apunta a otro repositorio.
3. Configurar las variables por entorno siguiendo [variables-entorno.md](variables-entorno.md).
4. PR verde: `npm run check`, `npm run docs:check`, `npm run build`, `npm run test:db` y
   `npm run e2e`.
5. Si el PR trae migración, **aplicarla primero** siguiendo [migraciones.md](migraciones.md).
6. Revisar el *preview* del PR a ojo contra la captura de referencia de la pantalla
   ([../diseno/pantallas.md](../diseno/pantallas.md)).
7. Mergear a `main`. Vercel despliega producción solo.
8. Comprobar en producción: cargar un mes, abrir un enlace de empleado, cambiar y deshacer un día,
   revocar el enlace y ver el panel.
9. Crear y restaurar el primer respaldo siguiendo [respaldo.md](respaldo.md).

El proyecto de pruebas cubre una sola base y un proyecto Vercel todavía sin Git. Los pasos de
producción (proyecto separado, preview, corte y respaldo restaurado) no se han ejecutado. No
etiquetar `v1.0.0` ni iniciar el corte de v1 hasta completarlos y recibir la validación de jefatura.

## Configuración de Vercel

En el repositorio hay [`vercel.json`](../../vercel.json) con:

- `buildCommand: npm run build`, `outputDirectory: dist`;
- *rewrites* para que la SPA resuelva sus rutas y `/api/*` llegue a las funciones;
- cabeceras de seguridad (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`) y caché inmutable para `/assets/*`.

Variables de entorno: [variables-entorno.md](variables-entorno.md).

## Volver atrás

Tres mecanismos independientes. Ver [volver-atras.md](volver-atras.md).

| Qué salió mal | Qué se usa |
|---|---|
| Datos (hoja equivocada) | «Volver a esta versión» en Fuente de datos |
| Código | *Instant Rollback* de Vercel |
| Esquema | SQL inverso documentado en la migración |

## Cómo verificarlo

El *preview* del PR carga y el flujo básico funciona. Tras mergear, la URL de producción sirve la
versión nueva y el enlace de empleado vigente sigue abriendo.

## Corte con v1

El procedimiento está preparado en
[ADR-0017](../adr/0017-corte-escalonado-de-v1.md), pero no se ejecuta hasta contar con una URL
estable, validar v2 con jefatura y acordar la duración de la transición. Los enlaces `?s=<uuid>` de
v1 no se pueden convertir automáticamente a slugs de v2.
