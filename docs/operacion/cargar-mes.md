# Runbook — Cargar el horario del mes

**Para jefatura.** Es el procedimiento mensual, y el que más se va a repetir.

> **Estado: pendiente.** La pantalla Fuente de datos llega en la **Fase 2**. Este runbook se
> completa entonces con capturas del producto real.

## Cuándo

Cuando coordinación publica el horario del mes nuevo, y cada vez que lo ajusta durante el mes.

## Pasos

1. Entrar en **Fuente de datos** (`/jefe/fuente`) con la cuenta de Google autorizada.
2. Elegir el origen:
   - **Google Sheet:** pegar el enlace o el ID. La pantalla interpreta el ID y el `gid` en vivo.
     Pulsar «Revisar ahora».
   - **Excel:** arrastrar el `.xlsx` o elegirlo. Solo `.xlsx`.
3. Elegir la **pestaña** (el mes). Por defecto se propone la del `gid` del enlace si es un mes; si
   no, el mes en curso. **Las pestañas ocultas se listan pero no se seleccionan solas.**
4. Leer el **resumen de lectura**:
   - pestañas encontradas;
   - número de personas, departamentos, sedes y días leídos;
   - cambios contra el mes anterior (ingresos, salidas, movimientos de departamento);
   - conflictos y avisos de importación.
5. **Revisar los avisos antes de publicar.** Si hay valores no reconocidos o departamentos
   desconocidos, suele ser un error de la hoja que conviene confirmar con coordinación.
6. Pulsar **«Publicar esta versión»**.
7. Comprobar en **Panel** y **Horario completo** que los números cuadran.

## Qué esperar

- **Publicar crea una versión.** No sobrescribe: la anterior queda en el historial con «Volver a
  esta versión» ([ADR-0010](../adr/0010-versiones-de-importacion.md)).
- **Si el archivo es idéntico al activo**, avisa «No hay cambios desde la última carga» y no
  publica. Es lo esperado, no un error.
- **Los cambios de jefatura sobreviven a la recarga**: se guardan por persona y fecha
  ([ADR-0003](../adr/0003-cambios-como-capa.md)). Pueden aparecer dos conflictos nuevos:
  - «la hoja ya trae este valor» (baja) → archivar el cambio;
  - «cambio sobre una persona que ya no está en la hoja» (media) → archivar el cambio.
- **Los enlaces activos siguen funcionando** y muestran la versión nueva. No hay que volver a
  repartirlos.

## Si algo va mal

| Qué pasa | Qué hacer |
|---|---|
| «La hoja pide iniciar sesión» (`HOJA_PRIVADA`) | Pedir a coordinación compartirla como «Cualquier persona con el enlace · Lector», o subir el Excel. Ver [incidentes.md](incidentes.md) |
| Los números no cuadran (faltan personas o días) | **No publicar.** Revisar que la fila 2 de la pestaña tenga las fechas. Ver [../datos/formato-hoja.md](../datos/formato-hoja.md) |
| Se publicó la hoja equivocada | «Volver a esta versión» en el historial. Ver [volver-atras.md](volver-atras.md) |

## Cómo verificarlo

Después de publicar: el panel muestra el día de hoy con sus métricas, el horario completo lista
todos los departamentos, y un enlace de empleado abre y encuentra a una persona por su nombre.
