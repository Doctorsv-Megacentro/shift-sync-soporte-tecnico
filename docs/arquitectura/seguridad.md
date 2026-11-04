# Seguridad y privacidad

Quién ve qué, y qué riesgos aceptamos a sabiendas. Fuente: plan §5.6, §6.3, §7.6, §12.

> **Estado: el acceso de jefatura está implementado y verificado** (RLS, `is_admin()`, el guardián
> de sesión de `app/RutaJefatura.tsx`). `/api/hoja` está escrito pero depende de ADR-0005
> (**Propuesto**) y no se ha probado contra una Google Sheet real. Los enlaces públicos llegan en la
> Fase 3 (alcance mínimo) y se completan en la Fase 7.

## Quién ve qué

| Quien entra | Cómo se identifica | Qué puede leer | Qué puede escribir |
|---|---|---|---|
| **Jefatura** | Google (Supabase Auth) **y** su correo en `admins` | Todo | Publicar importaciones, cambiar días, aceptar conflictos, crear y revocar enlaces |
| **Empleado** | Nada. Un enlace con slug | Solo lo que el alcance del enlace permite, vía `get_shared_view(slug)` | Nada |
| **`anon`** (cualquiera) | — | **Ninguna tabla directamente.** Solo `get_shared_view` con un slug válido y vigente | Nada |

Autenticarse con Google **no** da acceso: hay que estar además en `admins`. Quien entre sin estarlo
ve la pantalla «No tienes acceso de jefatura».

## Reglas que lo sostienen

1. **RLS activado en todas las tablas.** No hay excepciones, y `anon` no tiene política de lectura
   en ninguna.
2. **Las RPC son la única superficie.** `security definer` con `search_path` fijo, para que no se
   puedan secuestrar con un esquema en el camino.
3. **`get_shared_view` nunca devuelve quién hizo un cambio.** Sí el motivo, la nota y la fecha. El
   empleado necesita saber qué cambió y por qué, no a quién reclamarle.
4. **La clave de servicio solo en `/api`.** `SUPABASE_SERVICE_ROLE_KEY` **nunca** lleva el prefijo
   `VITE_`: todo lo que lo lleva termina en el paquete que descarga el navegador y es público.

## `/api/hoja` y el riesgo de SSRF

La función recibe **un ID**, no una URL. Construye ella misma la URL de exportación de Google a
partir de ese ID y **nunca acepta una URL libre**: así no se la puede usar para que el servidor pida
cualquier cosa (SSRF). Además valida el token de la sesión y `is_admin()` **antes** de descargar,
con un tope de 10 MB y un timeout.

Si la respuesta no es un `.xlsx` —Google devuelve la página de inicio de sesión cuando la hoja es
privada— responde `403 HOJA_PRIVADA`, y la interfaz explica qué pedirle a coordinación.

Ver [ADR-0005](../adr/0005-acceso-a-google-sheet.md), que está en estado **Propuesto**.

## Enlaces de solo lectura

- **Slug:** prefijo legible + **12 caracteres aleatorios base62** de `crypto.getRandomValues`. El
  hash corto del mockup no sirve en producción.
- **Vencimiento obligatorio:** 24 horas, 7 días o fin de mes.
- **Revocables** en cualquier momento, con `last_opened_at` para saber si se usó.
- Cada alcance (toda la operación, una semana con filtros, un día, una persona, un cambio) limita
  qué devuelve `get_shared_view`. Una prueba por alcance.

## Datos personales

Ver [ADR-0011](../adr/0011-datos-personales-fuera-del-repo.md). En resumen: `referencias/` está en
`.gitignore`, las pruebas usan fixtures sintéticos o anonimizados, y la Definición de terminado
incluye la casilla «ningún nombre real en el diff».

## Riesgos aceptados

| Riesgo | Por qué se acepta | Cómo se acota |
|---|---|---|
| **Quien tenga un enlace ve la operación mientras no venza** | El horario no tiene restricción de visibilidad interna: se usa para apoyarse entre áreas. Pedir cuenta a 100 personas frena la adopción ([ADR-0006](../adr/0006-acceso-de-empleados-y-jefatura.md)) | Slug aleatorio largo, vencimiento obligatorio, revocación, y el enlace no da ninguna escritura |
| **Si la hoja se comparte por enlace, cualquiera con el ID puede exportarla** | Es el precio de leerla sin credenciales y sin modificarla ([ADR-0005](../adr/0005-acceso-a-google-sheet.md)) | Pendiente de decisión (§13-1). La alternativa es una cuenta de servicio |
| **Vulnerabilidades en herramientas de desarrollo** | No llegan a producción: `npm audit --omit=dev` da 0 | [ADR-0012](../adr/0012-vulnerabilidades-de-desarrollo.md) y el paso de auditoría del CI |

## Cómo verificarlo

- `tests/db/`: `anon` sin lectura directa; un no admin no puede llamar `publish_import` ni
  `/api/hoja`; `get_shared_view` respeta alcance y vencimiento.
- Un enlace revocado muestra «Este enlace ya no está activo. Pide uno nuevo a jefatura.».
- Revisión independiente en la Fase 8, con la seguridad como primera prioridad.
