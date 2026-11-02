# 0007 — Los conflictos son funciones puras; solo se guarda «aceptado como está»

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0003](0003-cambios-como-capa.md), plan §7.3

## Contexto

El panel de jefatura detecta incoherencias en el horario: una sede sin supervisor, un descanso de
6 horas, una racha de 9 días seguidos. La tentación es guardarlas como filas con estado
(pendiente / resuelto) y actualizarlas.

El problema: los datos cambian por debajo. Se recarga la hoja, se edita un día, y una fila guardada
como «pendiente» ya no corresponde a nada.

## Decisión

Los conflictos son **funciones puras** sobre el horario efectivo (hoja + cambios), en
`src/domain/conflicts/`, un archivo por regla. No se guardan.

- **Resolver** significa crear un `day_override` que hace que la regla deje de cumplirse. El
  conflicto desaparece solo, porque los datos cambiaron.
- Lo único que se guarda es **«aceptado como está»**: una fila en `conflict_acks` con nota.
- Ambos se asocian al conflicto por su **clave estable** `regla:alcance`, por ejemplo
  `cobertura-supervision:tuscania:2026-11-02:14:00-18:00`.

## Alternativas consideradas

- **Guardar conflictos como filas con estado** — exige sincronizar el estado guardado con los datos
  cada vez que algo cambia, y deja filas huérfanas cuando el horario se recarga.

## Consecuencias

- Nada se desincroniza: el panel siempre refleja los datos actuales.
- Los parámetros de las reglas (descanso mínimo, racha máxima, hueco mínimo) viven en
  `src/domain/config.ts` y se pueden ajustar sin migrar datos. **Están pendientes de confirmar**:
  ver `docs/progreso.md`, bloqueo 2.
- Cada regla se prueba por separado con fixtures sintéticos.
- La clave estable debe ser determinista: si cambia su forma, los acks antiguos dejan de asociarse.

## Cómo verificarlo

Una prueba por regla con su caso positivo y su caso negativo. Prueba de integración: resolver un
conflicto de cobertura crea el `day_override` y el conflicto pasa a Resueltos sin tocar ninguna
tabla de conflictos. Los casos de control del plan §7.3 se verifican con el fixture anonimizado.
