# 0016 — Horario completo: alcance de la Fase 4 y meses combinados

- Estado: Propuesto
- Fecha: 2026-11-04
- Relacionado: [ADR-0015](0015-enrutador.md), plan §7.4, §7.5, §7.6, docs/features/horario.md

## Contexto

`GridOps.dc.html` es un único mockup que cubre tres fases del plan a la vez: Horario completo
(Fase 4, capturas 10/17/18), Cambiar un día + registro de cambios (Fase 5, capturas 11–14) y
Compartir completo (Fase 7, capturas 15–16). El `renderVals()` del mockup implementa los tres juntos
como un solo prototipo interactivo.

Construir solo la Fase 4 significa que varias piezas del mockup (el panel «Cambiar un día», el
registro «Cambios · n», el diálogo «Compartir» completo con sus cinco alcances) todavía no existen.
El botón mínimo de compartir (`EnlaceOperacion.tsx`, Fase 3) ya cubre «toda la operación»; los demás
alcances llegan en la Fase 7.

También: el mockup opera sobre **un mes a la vez** («Noviembre 2026 · hoja Noviembre» en la
cabecera, con `lunes` acotado a -5..30 dentro de ese mes). La vista de empleado (Fase 3) ya resolvió
el mismo problema —una semana que cruza de octubre a noviembre— combinando todos los meses activos
en uno solo (`domain/presence.ts`, `combinarMeses`).

## Decisión

1. **Tocar una celda, «Cambios · n» y «Compartir» quedan deshabilitados con una indicación
   «Próximamente»** en vez de abrir un panel que no existe todavía. El texto de ayuda de la cabecera
   se ajusta para no prometer una acción que no funciona: en vez de «Toca una celda para cambiar ese
   día · toca un nombre para ver su horario», queda «Toca un nombre para ver su horario. Cambiar un
   día llega en la próxima fase.» El botón de la vista rápida «Editar {día}» también queda
   deshabilitado por el mismo motivo.
2. **Horario completo combina todos los meses activos** con `combinarMeses`, igual que la vista de
   empleado, en vez del selector de un solo mes del mockup. La cabecera muestra el rango de fechas
   visible («2 nov – 8 nov») en vez de «hoja Noviembre».
3. **Los grupos de departamento van alfabéticos y abiertos por defecto.** El mockup usa el orden de
   su propio catálogo de datos de prueba (sin relación con `src/domain/config.ts`) y solo abre el
   primero. Con datos reales no hay un orden "natural" que replicar, y jefatura revisando el horario
   completo probablemente quiere ver todo de una vez; puede plegar los grupos que no necesite.

## Alternativas consideradas

- **Construir también Cambiar un día en esta misma sesión** — es la Fase 5 completa (panel de
  edición, alerta de descanso, registro de cambios, deshacer); mezclar las fases rompe el principio
  de una fase por sesión del plan §10 y hace el PR demasiado grande para revisar.
- **Selector de un solo mes, como el mockup** — más fiel al mockup, pero reintroduce el mismo
  problema de corte de semana que la Fase 3 ya resolvió para empleados; jefatura vería una semana
  incompleta al cruzar de mes.

## Consecuencias

- La Fase 5 reutiliza `get_admin_schedule` y `domain/overlay.ts` tal cual: ya traen los cambios de
  jefatura vigentes y el horario efectivo, solo falta el panel para crear uno nuevo.
- `docs/diseno/pantallas.md` marca las capturas 10, 17 y 18 cuando se revisen contra la
  implementación; 11–16 siguen pendientes de sus fases.
- Si una captura real de Fase 4 muestra algo que contradiga estas decisiones, se corrige aquí antes
  de la Fase 5.

## Cómo verificarlo

Probado a mano en el navegador con el fixture real: la vista Semana y Día muestran octubre y
noviembre sin cortar una semana a la mitad, los grupos se pliegan y despliegan, los filtros de
nombre/sede/rol funcionan, y los controles de «Cambios», «Compartir» y «Editar» se ven pero no hacen
nada, con el texto de ayuda ajustado.
