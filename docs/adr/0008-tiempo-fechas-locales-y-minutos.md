# 0008 — Tiempo: fechas locales y minutos desde medianoche; 00:00 no cruza

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0004](0004-un-solo-camino-de-lectura.md), plan §5.3

## Contexto

Todo el producto gira alrededor de horas: turnos que cruzan medianoche, descansos entre turnos,
cobertura por franja. Usar objetos `Date` de JavaScript para representarlos arrastra la zona horaria
del navegador a cada cálculo, y ahí es donde aparecen los errores de un día de más o de menos.

La operación está en una sola zona: `America/El_Salvador`, sin horario de verano.

## Decisión

- Las fechas son **texto `YYYY-MM-DD` local** (`DateKey`), no `Date`.
- Las horas son **minutos desde medianoche** (`startMin`, `endMin`), no marcas de tiempo.
- Si `end <= start`, se suma 1440: el turno termina al día siguiente y `endsNextDay` es cierto.
- **Un turno que termina `00:00` termina ese mismo día y no lleva «+1».** Es decir, `15:00-00:00`
  dura 9 h y **no** cruza medianoche; `21:00-06:00` dura 9 h y **sí** cruza.
- La semana empieza en **lunes**.

## Alternativas consideradas

- **Guardar `timestamptz` por turno** — correcto en teoría, pero obliga a convertir en cada lectura
  y expone el cálculo a la zona del cliente. Además, la hoja no tiene zona: tiene `HH:MM`.

## Consecuencias

- Los cálculos de duración, descanso y solape son aritmética de enteros: fáciles de probar y sin
  sorpresas de zona horaria.
- Coincide con el mockup, donde `15:00-00:00` no aparece marcado como que cruza.
- Si algún día la operación abarca otra zona horaria, esta decisión hay que revisarla.

## Cómo verificarlo

Pruebas de `src/domain/time.ts` y `shift.ts`: `21:00-06:00` dura 9 h y `endsNextDay` es cierto;
`15:00-00:00` dura 9 h y `endsNextDay` es falso. Es un criterio de aceptación explícito del
plan §6.5.
