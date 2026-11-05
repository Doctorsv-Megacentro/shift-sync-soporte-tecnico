# Runbook — Incidentes

Qué hacer cuando algo deja de funcionar. Cada entrada: **síntoma → causa probable → qué hacer**.

## 1. «La hoja pide iniciar sesión» (`HOJA_PRIVADA`)

**Síntoma.** Al pulsar «Revisar ahora» con un enlace de Google Sheets, la interfaz dice: «La hoja
pide iniciar sesión. Pide a coordinación compartirla como "Cualquier persona con el enlace ·
Lector", o sube el Excel.»

**Causa.** La hoja no está compartida por enlace, así que la URL de exportación devuelve la página
de inicio de sesión de Google en lugar de un `.xlsx`.

**Qué hacer.**
1. **Ahora mismo:** subir el `.xlsx` a mano. El producto funciona igual.
2. **Para que no vuelva a pasar:** pedir a coordinación que comparta la hoja como «Cualquier persona
   con el enlace · Lector». No modifica la hoja ni su contenido.

Esto es el estado esperado hoy, no una avería: ver [ADR-0005](../adr/0005-acceso-a-google-sheet.md),
en estado **Propuesto**, y `../progreso.md`, bloqueo 1.

## 2. Proyecto de Supabase pausado

**Síntoma.** Todo falla a la vez: ni jefatura entra ni los enlaces abren. Errores de conexión.

**Causa probable.** En el plan gratuito, Supabase puede pausar un proyecto con poca actividad
durante 7 días. Supabase envía un aviso aproximadamente una semana antes.

**Qué hacer.**
1. Entrar al panel de Supabase y restaurar el proyecto. La restauración desde el panel está
   disponible durante 90 días después de la pausa.
2. Comprobar que la aplicación vuelve: cargar el panel y abrir un enlace de empleado.
3. Si el panel ya no permite restaurarlo, recuperar la base desde el último `pg_dump` siguiendo
   [respaldo.md](respaldo.md).

**Mitigación.**

- Revisar los avisos de Supabase y la aplicación al menos una vez por semana.
- La actividad real de uso suele evitar la pausa; no se programa tráfico artificial solo para
  mantener el proyecto despierto.
- Si la operación necesita disponibilidad garantizada aun durante semanas sin uso, pasar a un plan
  que no pause proyectos antes de poner el sistema en producción.

Fuente consultada el 2026-11-04:
[Free Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing).
Hoy no hay un proyecto Supabase en la nube; este procedimiento se aplica cuando se aprovisione.

## 3. Un enlace de empleado no funciona

**Síntoma.** Quien abre el enlace ve «Este enlace ya no está activo. Pide uno nuevo a jefatura.»

**Causa.** El enlace **venció** o fue **revocado**. Es el comportamiento correcto
([ADR-0006](../adr/0006-acceso-de-empleados-y-jefatura.md)).

**Qué hacer.** En **Compartir**, crear un enlace nuevo con el alcance y el vencimiento adecuados, y
repartirlo. Si el enlace caduca más rápido de lo útil, usar el vencimiento «fin de mes».

**Si el enlace debería estar vigente:** revisar en Compartir que no esté en revocados y que
`expires_at` sea futuro. Si lo está y aun así falla, es un fallo de `get_shared_view`: revisar los
registros de Supabase.

## 4. Un conflicto que no tiene sentido

**Síntoma.** El panel marca un conflicto que jefatura sabe que no es real.

**Causa probable.** Un **umbral mal calibrado** (descanso mínimo, racha máxima, hueco mínimo) o un
**departamento fuera del catálogo**, que al quedar como «Sin sede» descuadra las reglas de cobertura.

**Qué hacer.**
1. Si es un caso puntual legítimo: **«Aceptar como está»** con una nota que explique por qué.
2. Si se repite: es un umbral que hay que ajustar. Los parámetros están en `src/domain/config.ts`
   y se cambian en un PR, con su ADR si cambia la regla. Ver
   [../datos/reglas-conflictos.md](../datos/reglas-conflictos.md).
3. Si la causa es un departamento desconocido: añadirlo al catálogo
   ([../datos/catalogo-departamentos.md](../datos/catalogo-departamentos.md)).

**Lo que no hay que hacer:** inventar un cambio de jefatura para silenciar el aviso. Eso altera el
horario real.

## 5. Se publicó la hoja equivocada

Ver [volver-atras.md](volver-atras.md), sección 1. Resumen: «Volver a esta versión» en el historial
de Fuente de datos. Inmediato, y los cambios de jefatura no se pierden.

## 6. Una clave se filtró

Ver [variables-entorno.md](variables-entorno.md), sección «Si una clave se filtra». La `anon key`
**no** es un secreto; la `service_role` sí, y hay que rotarla.

## Plantilla para anotar un incidente nuevo

```md
## N. Síntoma en una línea

**Síntoma.** Qué ve quien lo reporta.
**Causa.** Qué lo provocó, una vez investigado.
**Qué hacer.** Pasos, del más inmediato al definitivo.
**Para que no vuelva.** Cambio de código, de documentación o de procedimiento.
```
