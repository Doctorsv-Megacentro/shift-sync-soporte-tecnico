# 0004 — Un solo camino de lectura: todo entra como .xlsx

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0005](0005-acceso-a-google-sheet.md), plan §6.2

## Contexto

El horario puede llegar de dos sitios: un archivo Excel que sube jefatura, o una Google Sheet que
mantiene coordinación. Soportar los dos como formatos distintos significa dos lectores que probar,
mantener y mantener coherentes entre sí.

## Decisión

**Todo entra como `.xlsx`**, ya sea subido directamente o exportado desde Google Sheets por la
función `/api/hoja`, y pasa por el mismo parser en el navegador (`src/domain/workbook.ts`).

## Alternativas consideradas

- **Leer la Sheet por la API de Google, celda a celda** — un segundo formato de entrada y un segundo
  parser, con sus propias reglas de tipos y fechas. Duplica la superficie de prueba sin aportar nada
  que la exportación `.xlsx` no dé.

## Consecuencias

- Un solo parser, un solo conjunto de pruebas y un solo sitio donde arreglar un error de formato.
- El parser debe tolerar que un `.xlsx` exportado desde Google Sheets **no siempre trae fechas
  tipadas**: por eso `coerceSheetDate` acepta `Date`, serial de Excel, `YYYY-MM-DD` y `dd/mm/yyyy`
  (idea tomada de v1, plan §6.1).
- El parseo ocurre en el navegador, así que el servidor nunca guarda el archivo.

## Cómo verificarlo

Las pruebas de `workbook.ts` usan fixtures construidos con SheetJS que reproducen las dos
procedencias. El criterio del plan §6.5 exige que el libro real cargue sus tres pestañas y que
Septiembre se lea bien aunque sus fechas empiecen en la columna D.
