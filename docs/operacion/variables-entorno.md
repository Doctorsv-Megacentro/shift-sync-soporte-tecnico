# Runbook — Variables de entorno

Plantilla: [`.env.example`](../../.env.example). Copiar a `.env.local` para desarrollo.

## La regla que no se rompe

**Todo lo que lleva el prefijo `VITE_` termina en el paquete que descarga el navegador y es
PÚBLICO.** La clave de servicio **nunca** lleva `VITE_`.

## Las variables

| Variable | Dónde | Pública | Para qué |
|---|---|---|---|
| `VITE_SUPABASE_URL` | navegador | sí | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | navegador | sí | Clave `anon`. Es segura **porque** RLS no le da lectura a ninguna tabla ([seguridad](../arquitectura/seguridad.md)) |
| `SUPABASE_URL` | `/api` | no | Mismo proyecto, usado desde el servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api` | **NO — secreta** | Permite a `api/hoja.ts` validar el token de sesión y la lista de admins. Salta RLS: nunca al navegador |
| `E2E_BASE_URL` | Playwright | — | Opcional. URL contra la que corren los E2E |

## Local

**Sin Supabase propio en la nube:** arranca el stack local y usa sus valores, que son siempre los
mismos (ver [migraciones.md](migraciones.md), «El stack local de este repo»).

```bash
npx supabase start
```

```
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

SUPABASE_URL=http://127.0.0.1:55321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

Estos valores son el JWT de demo que Supabase CLI genera igual en cualquier instalación: no son
secretos, pero tampoco funcionan fuera de `localhost`. Aun así van solo en `.env.local`, nunca en
`.env.example` (que debe quedar con placeholders), para que nadie los copie a producción por error.

**Con un proyecto Supabase propio** (desarrollo o producción):

```bash
cp .env.example .env.local
# rellenar los valores del proyecto
```

`.env*` está en `.gitignore` salvo `.env.example`. **Nunca se commitea un `.env` con valores.**

## Vercel

Se configuran en el panel del proyecto, por entorno:

| Entorno | Apunta a |
|---|---|
| Development | Supabase de desarrollo |
| Preview | Supabase de desarrollo |
| Production | Supabase de producción |

Al añadir `SUPABASE_SERVICE_ROLE_KEY`, marcarla como *Sensitive*.

## Si una clave se filtra

1. Rotarla en Supabase (Project Settings → API → *Reset*).
2. Actualizarla en Vercel en los tres entornos y volver a desplegar.
3. Si fue la `service_role`, revisar los registros de acceso del proyecto.
4. Anotar el incidente en [incidentes.md](incidentes.md).

La `anon key` no es un secreto y no necesita rotarse si se expone: para eso está RLS.

## Cómo verificarlo

```bash
grep -rn "SERVICE_ROLE" src/   # no debe encontrar nada: solo se usa en api/
```

El build no debe contener la clave de servicio: `grep -r "service_role" dist/` tras
`npm run build` no debe dar resultados.
