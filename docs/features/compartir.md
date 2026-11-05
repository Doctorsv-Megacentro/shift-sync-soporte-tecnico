# Compartir

**Qué hace (para el usuario):** jefatura crea enlaces de solo lectura para toda la operación, una
semana con filtros, un día, una persona o un cambio. Elige vencimiento, copia o abre el enlace y
puede revocarlo desde la lista de activos.

**Dónde:** `/jefe/compartir` · capturas `15` y `16` · plan §7.6.

## Cómo funciona

`Compartir.tsx` lee el horario administrativo y calcula en dominio las personas que cumplen los
filtros de semana. `shareLinks.ts` crea una fila protegida por RLS en `share_links`. Al abrir
`/s/:slug`, la RPC pública `get_shared_view` valida vigencia y filtra antes de devolver datos:

- `operacion`: todos los meses activos;
- `semana`: siete fechas y solo las claves de persona que cumplían sede/rol al crear el enlace;
- `dia`: una fecha;
- `persona`: fija la persona y oculta el buscador; conserva la operación para «Quién está»,
  conforme a ADR-0006;
- `cambio`: fija persona y fecha, limita ese día y destaca la caja del cambio.

Los filtros de semana guardan `site` y `role` para describir el enlace, y `person_keys` para que
Postgres no duplique el catálogo de departamentos que pertenece a `src/domain/`.

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/features/compartir/Compartir.tsx` | Formulario, enlace creado, copia, vista previa y enlaces activos |
| `src/features/compartir/compartir.css` | Diseño adaptable de la pantalla |
| `src/data/shareLinks.ts` | Crear, listar y revocar enlaces bajo RLS |
| `src/domain/share.ts` | Alcances, parámetros, vencimientos y restricciones de la vista pública |
| `src/data/sharedView.ts` | Reconstruye `scope`, `params`, meses y cambios de la RPC |
| `src/features/empleado/VistaPersona.tsx` | Aplica persona/fecha/semana fija y oculta búsqueda cuando corresponde |
| `supabase/migrations/20261105015523_compartir_completo.sql` | Cinco alcances de `get_shared_view` y validación de cambios de un día |

## Seguridad

`anon` no lee `share_links` ni ninguna otra tabla. Solo ejecuta `get_shared_view(slug)`, una función
`security definer` con `search_path` fijo. Slug inexistente, parámetros inválidos, enlace vencido o
revocado producen el mismo `ENLACE_INACTIVO`. La respuesta nunca incluye `created_by`.

La misma migración endurece `save_day_override`: un turno requiere horas válidas; libre/vacaciones
no aceptan horas; motivo y sede deben pertenecer a sus catálogos; una persona de apoyo desconocida
se rechaza.

## Pruebas

- `tests/domain/share.test.ts`: slug, tres vencimientos y restricciones de semana/persona/cambio.
- `tests/db/get_shared_view.test.ts`: una prueba por alcance, vencimiento/revocación, RLS y
  privacidad de cambios.
- `tests/db/cambiar_un_dia.test.ts`: payloads inválidos, apoyo desconocido y autorización.

## Pendiente

- Comparación pixel a pixel con capturas 15–16: las referencias no estaban disponibles durante
  esta implementación.
- «Requerir correo de la empresa» sigue como **Próximamente** (ADR-0006).
