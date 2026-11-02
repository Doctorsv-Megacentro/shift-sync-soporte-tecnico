# 0005 — Acceso a la Google Sheet: exportar .xlsx de una hoja compartida por enlace

- Estado: **Propuesto**
- Fecha: 2026-11-02
- Relacionado: [ADR-0004](0004-un-solo-camino-de-lectura.md), [ADR-0006](0006-acceso-de-empleados-y-jefatura.md), plan §6.3, §13-1

> **Este ADR no está aceptado.** Depende de la pregunta abierta 1 de `docs/progreso.md`: si
> coordinación puede compartir la hoja como «Cualquier persona con el enlace · Lector», o agregar
> como lector el correo de una cuenta de servicio. **Hoy la hoja está privada.** El MVP funciona
> igual con Excel, así que nada se bloquea mientras tanto.

## Contexto

Coordinación mantiene el horario en una Google Sheet. Leerla automáticamente evita que jefatura
tenga que exportar y subir un archivo cada vez. Pero la hoja **no se puede modificar** y hoy pide
iniciar sesión para abrirla.

## Decisión (propuesta)

Exportar `.xlsx` desde la URL pública de exportación mediante la función `/api/hoja`, accesible
**solo para jefatura**:

1. Recibe el ID y el token de Supabase de la sesión.
2. Valida el token y que `is_admin()` sea cierto.
3. Arma **solo** la URL de exportación oficial de Google a partir del ID. **Nunca acepta una URL
   libre**, para evitar SSRF.
4. Descarga con un tope de 10 MB y un timeout.
5. Si la respuesta no es un `.xlsx` (Google devuelve la página de inicio de sesión), responde `403`
   con el código `HOJA_PRIVADA`.

Mensaje en la interfaz para `HOJA_PRIVADA`: «La hoja pide iniciar sesión. Pide a coordinación
compartirla como "Cualquier persona con el enlace · Lector", o sube el Excel.»

## Alternativas consideradas

- **Cuenta de servicio como lectora** — viable si coordinación puede agregar un correo a la hoja.
  No la modifica. Es la segunda opción si la primera no se aprueba.
- **OAuth de la jefatura** (leer con mi cuenta de Google) — más piezas y una pantalla de
  consentimiento. Queda como **Próximamente**.

## Consecuencias

- No requiere credenciales de Google ni modificar la hoja.
- Se acepta que **cualquiera con el ID podría exportarla** mientras esté compartida por enlace. Es
  coherente con ADR-0006: el horario no tiene restricción de visibilidad interna.
- Si la pregunta §13-1 se responde «no», este ADR se marca *Reemplazado* y el MVP queda solo con
  Excel.

## Cómo verificarlo

Un enlace de una hoja privada devuelve `HOJA_PRIVADA` y la interfaz muestra el mensaje exacto. Un ID
inválido se rechaza **antes** de llamar a la función. Un usuario no admin recibe `403` de
`/api/hoja` (criterio de aceptación de la Fase 2).
