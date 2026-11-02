# Formato de la hoja

Cómo debe venir el Excel o la Google Sheet, y cómo se interpreta cada celda. Fuente: plan §5.2–5.3.

> **Estado: analizado, parser pendiente.** Se implementa en la **Fase 1**
> (`src/domain/workbook.ts`, `shift.ts`, `time.ts`). El análisis se hizo sobre el libro real de
> octubre–diciembre de 2026.

## Estructura del libro

- **Una pestaña por mes.** Se ignoran `CONTACTOS` y las que empiezan con `_`.
- **Pestañas ocultas:** se listan, pero **no se seleccionan por defecto** (en el libro real,
  `Septiembre` viene oculta).
- **Fila 1:** nombre del día, con fórmulas tipo `=TEXT(C2,"dddd")`. **Se ignora.**
- **Fila 2:** las fechas reales. Cada columna se empareja con **su** fecha de la fila 2. Una columna
  cuya fila 2 no es una fecha **no es un día**.
- **Columna A:** departamento. **Columna B:** nombre. **Filas 3 en adelante:** una persona por fila.
  Las filas sin nombre se ignoran.
- El **color de celda es decorativo** y no se usa para nada.

### Por qué la fila 2 manda

Emparejar cada columna con su propia fecha —en vez de asumir que los días empiezan en la columna C—
resuelve dos casos reales del libro:

- `Septiembre` empieza las fechas en la **columna D**; la C trae una fórmula de horas con el
  encabezado `184/163`.
- `Septiembre` **termina** con una columna `Libres por` que contiene un `=COUNTIF(...)`.

Ninguna de las dos es un día, y ninguna rompe la carga: van a `skipped` como aviso.

Una pestaña que no encaje con el formato **no rompe la importación**: se salta y se avisa.

## Interpretación de una celda

Primero se normaliza: sin tildes, en mayúsculas y con espacios simples.

| Entrada normalizada | Resultado |
|---|---|
| `^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$` | `work` con `startMin` y `endMin`. Si `end <= start`, se suma 1440 |
| `LIBRE` | `off` |
| contiene `VACAC` | `vacation` |
| vacío u otro valor | `unknown`: se guarda `raw` y **genera aviso** |

- `endsNextDay = endMin > 1440`. Por eso **`15:00-00:00` termina a las 24:00 del mismo día** y no
  lleva «+1» ([ADR-0008](../adr/0008-tiempo-fechas-locales-y-minutos.md)).
- La duración es `endMin - startMin`.
- **Categoría de color** según la hora de entrada: antes de las 12:00 mañana/día; antes de las 17:00
  tarde; el resto noche.
- **Franjas del panel** (otra cosa, solo para contar): antes de 08:00 Mañana; antes de 12:00 Día;
  antes de 17:00 Tarde; el resto Noche.

## Fechas que no vienen tipadas

Un `.xlsx` exportado desde Google Sheets no siempre trae las fechas como tal. El lector acepta
`Date`, serial de Excel, `YYYY-MM-DD` y `dd/mm/yyyy`, y devuelve siempre un `DateKey` local (idea
tomada de `coerceSheetDate` de v1).

## Tamaños reales del libro analizado

| Pestaña | Personas | Días |
|---|---|---|
| Octubre | 98 | 31 |
| Noviembre | 103 | 30 |
| Septiembre | — | oculta |

Valores de celda en noviembre: turnos `HH:MM-HH:MM`, `Libre` (972), `Vacaciones` (73) y
`VACACIONES` (15).

## Criterios de aceptación

Del plan §6.5:

- [ ] El libro real carga sus tres pestañas; Septiembre aparece oculta y no seleccionada. Noviembre
      da **103 personas, 26 departamentos, 7 sedes (más «Sin sede») y días 1–30**.
- [ ] Septiembre se lee bien aunque sus fechas empiecen en la columna D y termine con `Libres por`.
- [ ] `VACACIONES` y `Vacaciones` dan el mismo resultado.
- [ ] Una celda vacía o desconocida genera aviso y **no** rompe la carga.
- [ ] `21:00-06:00` dura 9 h y termina al día siguiente. `15:00-00:00` dura 9 h y **no** lleva «+1».
- [ ] Parsear el libro real tarda menos de 2 s en un portátil normal.

## Relacionado

[catalogo-departamentos.md](catalogo-departamentos.md) · [reglas-conflictos.md](reglas-conflictos.md) ·
[ADR-0004](../adr/0004-un-solo-camino-de-lectura.md) ·
[ADR-0008](../adr/0008-tiempo-fechas-locales-y-minutos.md)
