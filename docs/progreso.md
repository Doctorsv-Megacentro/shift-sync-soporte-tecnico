# Progreso

Estado del MVP de ShiftSync v2. Se actualiza en **cada** cambio (Definición de terminado, §9.3).

| Fase | Qué incluye | Estado | Notas |
|---|---|---|---|
| 0 | Repo, herramientas y esqueleto de docs | **Hecho** | `check`, `docs:check` y `build` en verde |
| 1 | Dominio: leer la hoja | **Hecho** | Opus. 189 pruebas, verificado contra el Excel real |
| — | Demo local (adelanto de la Fase 3, fuera del plan) | **Hecho** | Probada en navegador. ADR-0013/0014 Propuestos |
| 2 | Base de datos, acceso de jefatura y Fuente de datos | **Siguiente** | Opus. Necesita proyecto Supabase nuevo |
| 3 | Vista empleado + enlace de la operación | Sin empezar | Sonnet. **Primer entregable usable** |
| 4 | Horario completo | Sin empezar | Sonnet |
| 5 | Cambiar un día + registro de cambios | Sin empezar | Sonnet |
| 6 | Panel y conflictos | Sin empezar | Opus |
| 7 | Compartir completo | Sin empezar | Sonnet |
| 8 | Producción | Sin empezar | Opus, en sesión nueva (revisión independiente) |

## Último cambio

**2 nov 2026 · Fase 1 cerrada: el dominio lee la hoja completa.**

`src/domain/` tiene ahora 11 archivos de lógica pura — `types`, `config`, `text`, `time`, `shift`,
`names`, `catalog`, `workbook`, `validate`, `diff`, `presence` — y `src/data/excel.ts` como único
punto que conoce SheetJS. **189 pruebas** (177 con fixtures sintéticos + 12 contra el Excel real),
todas en verde.

Qué quedó hecho:

- **`time.ts`**: `DateKey` en texto, minutos desde medianoche, semana de lunes a domingo. El serial
  de Excel se interpreta con la compensación del día 29-feb-1900 ficticio que Excel cuenta y el
  calendario no tiene — sin eso, las fechas salían desplazadas un día.
- **`shift.ts`**: interpreta `HH:MM-HH:MM`, `Libre`, variantes de `Vacaciones` y lo desconocido.
  `15:00-00:00` dura 9 h y no cruza; `21:00-06:00` sí (ADR-0008), verificado tanto con fixtures como
  con cada turno real de la hoja.
- **`names.ts`**: clave estable por tokens ordenados, nombre a mostrar con partículas agrupadas y
  `needsReview` para el orden dudoso. Se encontró y corrigió un caso que el plan no cubría: ver
  ADR-0013.
- **`catalog.ts`**: los 26 departamentos de la tabla explícita, el alias de «Adminsitrador de Redes»,
  y reglas de respaldo por fragmento (con cuidado de que no coincidan como subcadena).
- **`workbook.ts`**: lee el libro con la regla de que «la fila 2 manda» — una columna cuya fila 2 no
  es fecha no es un día. Pestañas que no encajan van a `skipped` sin romper la carga.
- **`validate.ts`** y **`diff.ts`**: avisos de importación y comparación contra el mes anterior por
  clave estable, para que un nombre reescrito no se confunda con un ingreso más una salida.
- **`presence.ts`**: adelantado de la Fase 3 porque la demo local lo necesita. «Quién está ese día»
  en sus tres alcances, búsqueda sin tildes, resumen de semana y métricas del día.
- **`scripts/anonimizar-excel.ts`**: genera `tests/fixtures/horario-anon.xlsx` a partir del Excel
  real. Verificado a mano, descomprimiendo el `.xlsx` y buscando en el XML: **0 nombres reales
  sobreviven** y el vocabulario ficticio se filtra para no solapar con el original.
- **Todos los criterios del plan §6.5 verificados contra el archivo real** en `tests/local/`
  (`npm run test:local`, fuera del CI): las 3 pestañas, Septiembre oculta y desde la columna D,
  Noviembre con 103/26/8 sedes y días 1–30, Octubre con 98/31, los conteos exactos de `Libre` (972),
  `Vacaciones` (73) y `VACACIONES` (15), y el parseo completo en ~0.2 s (el criterio pide < 2 s).

**Nada se ha commiteado todavía** de este trabajo: sigue pendiente del visto bueno de Ado, igual que
la Fase 0.

**2 nov 2026 · Demo local construida y probada en navegador.**

Pedida directamente por Ado, fuera del plan: `src/features/demo/` (`Demo.tsx`, `VistaEmpleado.tsx`)
lee un `.xlsx` en el navegador con `src/data/excel.ts` y pinta buscador, semana, tarjeta del día y
«quién está ese día», sin Supabase, sin login y sin enlaces. Decisión documentada en
[adr/0014-demo-local-antes-de-fase-2.md](adr/0014-demo-local-antes-de-fase-2.md) (**Propuesto**),
ficha en [features/demo.md](features/demo.md).

Probada de punta a punta con `npm run dev` y el fixture anonimizado, en el navegador:

- subir el archivo detecta las 3 pestañas y preselecciona Noviembre (el último mes visible);
- la búsqueda («an») devuelve hasta 6 personas con rol, sede y departamento;
- un turno `15:00-00:00` se muestra **sin** «termina al día siguiente» — el ADR-0008 se confirmó en
  pantalla, no solo en las pruebas;
- un día `Libre` deshabilita y atenúa el chip «Mismo horario», como pide el plan §7.1;
- «Mismo horario» listó 6 personas reales de sedes y departamentos distintos con el mismo horario
  exacto; «Mi equipo» en un día sin compañeros mostró «Nadie en este alcance»;
- tocar una fila de «quién está» cambia la vista a esa persona y aparece «Volver a mi horario», que
  al pulsarlo regresa a la persona original;
- cambiar de mes en el selector reinicia la búsqueda y la semana.

Sin errores en consola. `npm run check`, `npm run docs:check` y `npm run build` en verde con el
código de la demo incluido.

## Siguiente paso

**Fase 2 — Base de datos, acceso de jefatura y Fuente de datos** (3 días, Opus). Reutiliza
`src/domain/` y `src/data/excel.ts` tal cual: nada de lo construido en la Fase 1 ni en la demo se
tira, salvo la propia pantalla de demo, que se retira cuando la Fase 3 construya la vista de empleado
real.

Antes de arrancarla, conviene cerrar dos cosas:

- El visto bueno de Ado a los ADR-0013 y 0014 (ambos en **Propuesto**).
- La pregunta abierta 4 de más abajo (correos de jefatura), que bloquea `admins`.

### Hallazgos sobre la hoja real que quedan para después

- **No hay ninguna celda vacía ni ningún valor no reconocido** en las tres pestañas del archivo de
  octubre–diciembre. El parser sigue tolerándolos porque otro mes puede traerlos, pero no hay un caso
  real para probar la regla `valor-no-reconocido` hasta que aparezca uno.
- No existe la pestaña `CONTACTOS` en este archivo. Ignorarla sigue siendo correcto por defensa.
- Septiembre tiene 95 personas y 24 departamentos; octubre, 49 celdas `Vacaciones`.
- **ADR-0013** (Propuesto): un apellido con partícula (`CRUZ DE LEON MARTA`) rompía la regla de
  reparto del plan §5.5 y daba «De Leon Marta Cruz». Corregido y probado; falta el visto bueno.

## Bloqueos / preguntas abiertas

Las 4 del §13 del plan. **Ningún ADR que dependa de ellas pasa de «Propuesto»**, y nada que no
dependa de ellas se detiene por esto. No se asumen respuestas.

### 1. Acceso a la Google Sheet → bloquea [ADR-0005](adr/0005-acceso-a-google-sheet.md)

¿Coordinación puede compartir la hoja como «Cualquier persona con el enlace · Lector», o agregar
como lector el correo de una cuenta de servicio? Ninguna de las dos modifica la hoja.

Hoy la hoja está privada. Si ninguna opción es posible, el MVP queda **solo con Excel** y «Leer con
mi cuenta de Google» pasa a Próximamente. *Las fases 0 y 1 no dependen de esto;* la 2 sí, para
`/api/hoja`.

### 2. Umbrales de las reglas de conflicto

Valores propuestos, pendientes de confirmar. Vivirán en `src/domain/config.ts`:

| Parámetro | Propuesto |
|---|---|
| Descanso mínimo entre turnos | 8 h (severidad alta por debajo) |
| Aviso de descanso justo | hasta 9 h (severidad baja) |
| Racha máxima de días seguidos | 7 |
| Hueco mínimo de cobertura | 60 min |
| Sedes que exigen supervisor en turno | Megacentro y Tuscania. ¿Atento, Santa Ana y San Miguel con su coordinación? |

Afecta a la Fase 6. Se puede implementar con los valores propuestos y ajustarlos después, porque
son parámetros, no estructura. Ver [datos/reglas-conflictos.md](datos/reglas-conflictos.md).

### 3. Corte con v1

El repo nuevo ya está decidido y en uso ([ADR-0001](adr/0001-repo-nuevo.md), Aceptado). Queda
pendiente: ¿cuándo se apaga `shiftsync-rho-neon.vercel.app` y qué pasa con los enlaces `?s=<uuid>`
ya repartidos, redirigir o retirar? Afecta a la Fase 8.

### 4. Correos con acceso de jefatura

¿Qué correos van en la tabla `admins`? Se cargan por SQL siguiendo el runbook; **no van en el
repo**. Afecta a la Fase 2.
