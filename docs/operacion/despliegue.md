# Runbook — Despliegue

Fuente: plan §12.

## Entornos

| Entorno | Sitio | Base de datos | Se despliega desde |
|---|---|---|---|
| Local | `npm run dev` (`localhost:5173`) | Supabase de desarrollo | — |
| *Preview* | Vercel, una URL por PR | Supabase de desarrollo | cada push a una rama con PR |
| *Production* | Vercel | Supabase de **producción** | `main` |

## Qué es público

**Solo `get_shared_view` con un slug válido y vigente.** Todo lo demás requiere sesión de jefatura.
Ver [../arquitectura/seguridad.md](../arquitectura/seguridad.md).

## Desplegar

1. PR verde: `npm run check`, `npm run docs:check`, `npm run build` y la auditoría de producción
   (lo comprueba el CI).
2. Si el PR trae migración, **aplicarla primero** siguiendo [migraciones.md](migraciones.md).
3. Revisar el *preview* del PR a ojo contra la captura de referencia de la pantalla
   ([../diseno/pantallas.md](../diseno/pantallas.md)).
4. Mergear a `main`. Vercel despliega producción solo.
5. Comprobar en producción: cargar un mes, abrir un enlace de empleado, ver el panel.

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
