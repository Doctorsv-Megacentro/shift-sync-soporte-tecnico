# Progreso

Estado del MVP de ShiftSync v2. Se actualiza en **cada** cambio (Definición de terminado, §9.3).

| Fase | Qué incluye | Estado | Notas |
|---|---|---|---|
| 0 | Repo, herramientas y esqueleto de docs | **Hecho** | `check`, `docs:check` y `build` en verde |
| 1 | Dominio: leer la hoja | **Hecho** | Opus. 189 pruebas, verificado contra el Excel real |
| — | Demo local (adelanto de la Fase 3, fuera del plan) | **Hecho** | Probada en navegador. ADR-0013/0014 Propuestos |
| 2 | Base de datos, acceso de jefatura y Fuente de datos | **Hecho** | Opus. Esquema + RLS + RPC probados contra Supabase local; falta proyecto en la nube |
| 3 | Vista empleado + enlace de la operación | **Hecho** | Sonnet. **Primer entregable usable** |
| 4 | Horario completo | **Hecho** | Sonnet. La edición de un día se cerró en la Fase 5 (ADR-0016) |
| 5 | Cambiar un día + registro de cambios | **Hecho** | Sonnet. Los CTA de compartir se conectaron en la Fase 7 |
| 6 | Panel y conflictos | **Hecho** | Opus. 16 reglas; el «17» de descansos justos de noviembre da 12 con la fórmula escrita |
| 7 | Compartir completo | **Hecho** | Sonnet. Cinco alcances, tres vencimientos, activos y revocación |
| 8 | Producción | **Hecho en local; pruebas en nube a medias** | Supabase de pruebas listo; Vercel creado, sin Git todavía |

## Último cambio

**4 nov 2026 · Fase 8 hecha en local, bloqueada en la nube.**

E2E Playwright del flujo de aceptación (publicar, enlace de operación, consultar, cambiar,
deshacer, revocar) en escritorio y móvil de 390 px, contra Supabase local y el fixture
anonimizado. En 390 px el menú de jefatura pasaba por encima de la grilla; ahora es una barra
superior. Runbooks de pausa (7 días / restauración 90 días), respaldo (`pg_dump` de roles,
esquema y datos; el CLI no vuelca `auth`) y despliegue. El corte de v1 queda preparado en
[ADR-0017](adr/0017-corte-escalonado-de-v1.md) (**Propuesto**) y **no se ejecuta**.

`npm run e2e` pasó 2/2 (escritorio y móvil, ~10 s cada uno) el 4 nov 2026. `npm run check`
(251 unitarias), `docs:check`, `build`, `test:db` (56) y `test:local` (13) también en verde.

Revisión independiente (sesión aparte, solo lectura): sin hallazgos altos de RLS ni
`service_role` en el cliente. Se corrigieron en este cierre el ejemplo de apellido con partícula (ahora
`FUENTES DE LEON NURIA`), la ficha de `/demo` y los runbooks de carga y OAuth.
Quedan como seguimiento, no como gate: prueba de `/api/hoja`, restringir escrituras admin a
RPC, retirar `/demo`, y correr `test:db`/E2E en CI cuando exista un proyecto de desarrollo.

Por decisión de esta fase **no** se crearon proyectos Supabase en la nube ni un preview de
Vercel. El proyecto Vercel existente con nombre parecido apunta a otro repositorio y no se
reutiliza. Sin base remota no hay promoción a producción, no se etiqueta `v1.0.0` y v1 sigue
en línea.

**4 nov 2026 · Fase 7 cerrada: Compartir completo.**

`/jefe/compartir` crea enlaces de operación, semana con filtros, día, persona o cambio; ofrece 24
horas, 7 días o fin de mes, copia con fallback, vista previa y revocación. `get_shared_view` filtra
fechas y personas antes de responder. La vista pública fija persona/fecha y oculta búsqueda según
el alcance. Horario, vista rápida, aviso y registro llevan el contexto al formulario.

La misma migración endurece `save_day_override`, y el panel ya no permite «Asignar cobertura» sin
opciones. Ficha: [features/compartir.md](features/compartir.md). La revisión pixel a pixel de las
capturas 15–16 queda pendiente porque las referencias no estaban disponibles.

**4 nov 2026 · Fase 6 cerrada: panel y conflictos.**

`/jefe/panel` calcula las 16 reglas sobre el horario efectivo y deja resolverlas sin tocar la hoja:
asignar cobertura escribe un `day_override` con `conflict_key`, y «Aceptar como está» una fila en
`conflict_acks`. El menú muestra cuántos quedan pendientes. Ficha: [features/panel.md](features/panel.md).
Los umbrales siguen **Propuestos** (bloqueo §2); no hay ADR nuevo.

El «17» de descansos justos de noviembre no se reproduce: la fórmula (8 h o más y menos de 9 h,
entre días seguidos trabajados) da **12** en esa hoja. El resto de cifras de control del plan §7.3
sí cuadra, incluido el lunes 2 de noviembre.

**4 nov 2026 · Fase 5 cerrada: cambiar un día y registro de cambios.**

`domain/edicion.ts` (15 pruebas): los horarios más frecuentes de un departamento, los avisos de
descanso y quién coincide o puede dar apoyo. Los umbrales de 8 h y 12 h son los **Propuestos** del
bloqueo §2: el plan §7.5 ya los usa en esta pantalla, y siguen sin confirmarse.

`save_day_override` y `revoke_day_override`
(`supabase/migrations/20261104200000_cambiar_un_dia.sql`): guardar revoca el cambio vigente de esa
persona y fecha e inserta el nuevo en la misma transacción; deshacer revoca y no falla si ya no hay
nada. 8 pruebas nuevas en `tests/db/cambiar_un_dia.test.ts`. **46 pruebas de base de datos** en
verde.

El panel en `/jefe/horario` (`PanelEdicion.tsx`, `RegistroCambios.tsx`) abre desde una celda, desde
«Editar» de la vista Día y desde «Editar {día}» de la vista rápida. «Compartir» sigue deshabilitado
(Fase 7). ADR-0016 queda actualizado: el punto 1 ya no apaga esos botones. La ficha de la Fase 4 se
amplió; no hay ficha nueva porque es la misma pantalla.

**Bug real, encontrado al reabrir un día ya cambiado:** el panel precargaba el horario y el apoyo,
pero el motivo y la nota salían vacíos, así que «Guardar cambio» pedía el motivo otra vez. El
mockup sí los recupera. Corregido y reverificado: al reabrir, motivo, nota y apoyo siguen marcados.

**Probado de punta a punta en el navegador** con el fixture anonimizado (octubre 98 personas,
noviembre 103): celda con el valor de la hoja, horarios rápidos reales del departamento, aviso de
descanso al poner `06:00-14:00` después de un `21:00-06:00` sin bloquear el guardado, compañeros y
apoyo, aviso verde, borde punteado en la celda, registro con «Deshacer» y «Volver a lo de la hoja».
Sin errores en la consola.

El stack local de Supabase y el servidor de desarrollo se apagaron al terminar.

**4 nov 2026 · Fase 4 cerrada: horario completo de jefatura (solo lectura).**

`get_admin_schedule()` (`supabase/migrations/20261104190000_get_admin_schedule.sql`): RPC interna
para jefatura, sin pasar por `share_links`, que solo comprueba `is_admin()` y devuelve el mismo
`months`/`overrides` que `get_shared_view` para toda la operación — reutilizando el mismo filtro por
fecha dentro del mes de cada versión (la lección de la Fase 3) para no reintroducir la misma
duplicación. `src/data/meses.ts` saca la reconstrucción jsonb→dominio de `sharedView.ts` a un módulo
compartido, y `domain/presence.ts` gana `combinarMeses` (antes vivía solo en `VistaPersona.tsx`), que
ahora usan tanto la vista de empleado como el horario completo.

`domain/grid.ts` (14 pruebas nuevas): agrupa por departamento (no por rol, porque dos departamentos
pueden compartir rol), filtra por nombre/sede/rol, y calcula la posición de las barras de la vista
Día — el turno de hoy, recortado a medianoche, y la parte de un turno de **ayer** que cruzó, como
barra punteada desde las 00:00.

La pantalla real en `/jefe/horario` (`src/features/horario/`): vista Semana (grupos plegables, grid
con nombre fijo, celda coloreada por categoría, punto naranja si hay un cambio de jefatura), vista
Día (línea de tiempo 00–24), filtros, y un panel de vista rápida al tocar un nombre. Siguiendo
ADR-0016 (**Propuesto**): como `GridOps.dc.html` mezcla las Fases 4, 5 y 7 en un solo prototipo,
«Cambios», «Compartir» y «Editar» quedan deshabilitados con un indicador «Próximamente», y la
pantalla combina todos los meses activos (como la vista de empleado) en vez del selector de un mes
del mockup, para que una semana no se corte en el límite de un mes.

**Otro bug real, encontrado probando en el navegador con datos reales, no solo con pruebas
automáticas**: la barra punteada de «ayer» no se veía en absoluto. La causa: el código usaba el tono
de **fondo** de la categoría del turno (un pastel muy claro) como `color` CSS para un borde
`1px dashed currentColor` — contra el fondo claro de la línea de tiempo, ese borde quedaba
invisible. Se vio al probar con un turno real `20:00–06:00` y mirar el día siguiente: el texto decía
«hasta 06:00 (de ayer)» pero no había ningún trazo. Corregido usando el tono de **texto** de la
categoría (más oscuro, pensado para contraste) — que es justo lo que hace el mockup.

**38 pruebas de base de datos** en verde (`npm run test:db`): las 32 de la Fase 3 más las 6 nuevas de
`get_admin_schedule` (autorización — anon no puede, un autenticado sin ser admin tampoco, un admin
sí —, datos de un mes publicado, un cambio sin exponer quién lo hizo, y la regresión del bug de
duplicación de meses). **217 pruebas unitarias** en total.

**Probado de punta a punta en el navegador** con el fixture anonimizado real (106 personas, 26
departamentos, octubre y noviembre en un solo import, igual que en la Fase 3): vista Semana y Día con
datos reales, plegar/desplegar grupos, los tres filtros combinados, la vista rápida de una persona, y
navegar semanas cruzando el límite de mes (30 nov – 6 dic, con diciembre todavía sin publicar
mostrando «Sin datos» en vez de romperse). Sin errores ni warnings en consola.

El stack local de Supabase y el servidor de desarrollo se apagaron al terminar.

**4 nov 2026 · Fase 3 cerrada: vista de empleado + enlace de la operación.**

`get_shared_view` (`supabase/migrations/20261104180132_get_shared_view.sql`) es la única función que
`anon` puede llamar: valida el slug (inexistente, vencido y revocado dan el mismo mensaje, a
propósito), y devuelve `scope`, `title`, `source`, `months[]` y `overrides[]` — nunca quién hizo un
cambio (plan §5.6). Encima, `domain/overlay.ts` (el horario efectivo: hoja + cambios de jefatura,
ADR-0003) y `domain/share.ts` (slug con `crypto.getRandomValues`, vencimiento, vigencia) — 20
pruebas nuevas en `tests/domain/`. `src/data/sharedView.ts` reconstruye el jsonb a `ParsedMonth[]` /
`DayOverride[]` con `resolveDepartment()` del catálogo, nunca con datos de rol/sede de la base.

La pantalla real en `/s/:slug` (`src/features/empleado/`) reutiliza `domain/presence.ts` tal cual de
la Fase 1: buscador, semana, tarjeta del día (con la caja de «Cambio hecho por jefatura» si
corresponde) y «quién está ese día» en sus tres alcances. En Fuente de datos,
`EnlaceOperacion.tsx` agrega crear/copiar/revocar el enlace.

**Un bug real, no solo cosmético, se encontró probando con el fixture real en el navegador** (ver
ficha, docs/features/empleado.md, «Bug real encontrado»): un import que cubre dos meses calendario a
la vez (así viene la hoja real: octubre y noviembre en el mismo archivo) hacía que `get_shared_view`
devolviera **todas** las entradas del import duplicadas en los dos meses, en vez de solo las de cada
uno — `get_shared_view` filtraba `entries`/`people`/`dates` por `import_id` pero no por fecha dentro
del mes. Síntoma en pantalla: «Toda la operación» del 5 de noviembre mostraba 166 personas en vez de
~103, y una persona mostraba un departamento distinto en la cabecera y en la tarjeta del día.
Confirmado primero con `psql` directo (la base estaba limpia; el jsonb crudo de la función traía el
import completo repetido en cada mes), corregido filtrando también por `se.date` dentro del rango del
mes de cada `month_versions`, con un caso de regresión nuevo en `tests/db/get_shared_view.test.ts` (un
import con dos meses, entradas distintas en cada uno) y reverificado en el navegador: el conteo bajó
de 166 a 83 (justo la mitad) y el departamento ya es consistente.

**32 pruebas de base de datos** en verde (`npm run test:db`): las 21 de la Fase 2 más las 11 nuevas de
`get_shared_view` (slugs inválidos, un enlace vigente, cambios de jefatura sin exponer quién los
hizo, un usuario con sesión pudiendo abrir su propio enlace, y la regresión del bug de arriba).

**Probado de punta a punta en el navegador**, con sesión de admin inyectada y el fixture anonimizado
real: publicar octubre+noviembre desde un solo archivo, crear el enlace desde Fuente, abrirlo en otra
pestaña, buscar una persona, navegar semanas que cruzan el límite de mes, los tres alcances de «quién
está», «Volver a mi horario», y un enlace recién revocado mostrando «Este enlace ya no está activo»
al recargar. Sin errores ni warnings en consola. Queda pendiente la comparación pixel a pixel en
390 px contra la captura `05-empleado-movil.png` (no se pudo redimensionar la ventana del navegador
de esta sesión); el CSS ya sigue la regla del plan §7.8-3.

El stack local de Supabase y el servidor de desarrollo se apagaron al terminar; nada quedó corriendo
en segundo plano.

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

**4 nov 2026 · Fase 2 cerrada: base de datos, acceso de jefatura y Fuente de datos.**

`supabase/migrations/20261104172348_esquema_inicial.sql`: las 8 tablas del modelo, RLS en todas, y
las RPC `is_admin`, `publish_import`, `activate_import`. **No se probó solo leyendo el SQL**: se
instaló el CLI de Supabase, se arrancó un stack local (Docker, puertos 55320–55329 para no chocar con
otros proyectos que ya corrían en esta máquina) y se aplicó la migración de verdad con
`supabase db reset`. Eso encontró **dos errores reales** que una revisión de código no habría visto:

- `is_admin()` estaba definida *después* de las políticas RLS que la usan — Postgres aplica el
  archivo en orden y falló al crear la primera política.
- `revoke all on function … from public` no le quita permiso a `anon`: Supabase da `EXECUTE` a `anon`
  por defecto en toda función nueva del esquema `public`, así que `anon` podía llamar a `is_admin()`
  hasta que se revocó explícitamente de `anon` y `authenticated`.

Con eso corregido, **21 pruebas de base de datos** (`tests/db/`, `npm run test:db`) verifican contra
el stack local: `anon` no lee ni escribe ninguna tabla, un usuario autenticado que no es admin no
puede publicar, `publish_import` crea personas y entradas correctamente, respeta un `display_name`
corregido a mano, `content_hash` evita publicar el mismo archivo dos veces, y `activate_import`
cambia la versión activa de un mes y rechaza uno que el import no cubre.

Encima de la base: `src/data/` (`supabase.ts`, `auth.ts`, `imports.ts`, `content-hash.ts`),
`app/useSesion.ts` + `app/RutaJefatura.tsx` (el guardián: sin sesión → login con Google; con sesión
sin acceso → «No tienes acceso de jefatura»; con acceso → el layout con menú), la pantalla
**Fuente de datos** completa (`src/features/fuente/Fuente.tsx`: subir, resumen de lectura con
checkboxes por mes, diff contra el mes anterior, publicar, historial con «Volver a esta versión»), y
`api/hoja.ts` (escrito según ADR-0005, sin probar contra una Google Sheet real porque esa decisión
sigue sin resolverse).

**Probado de punta a punta en el navegador**, no solo con pruebas automáticas: se creó un usuario de
prueba admin contra el stack local, se inyectó su sesión en la página, y se subió el fixture
anonimizado real. El resumen de lectura mostró los conteos exactos ya verificados en la Fase 1
(103/26/8 en Noviembre, 98/31 en Octubre) y el diff automático dio «12 cambios de departamento y
1 salida» — el mismo caso de control del plan §7.3. Publicar, ver el historial y «Volver a esta
versión» cambiaron la versión activa del mes correctamente sin tocar los demás meses. Con un usuario
autenticado que no estaba en `admins`, la pantalla mostró «No tienes acceso de jefatura» tal cual.

Necesitó una decisión técnica nueva: [ADR-0015](adr/0015-enrutador.md) (React Router), **Aceptado**
porque es una decisión dentro del stack ya elegido, no una regla de negocio.

El stack local de Supabase y el servidor de desarrollo se apagaron al terminar
(`supabase stop`); nada quedó corriendo en segundo plano.

## Siguiente paso

**Primer despliegue de pruebas.** `shift-sync-soporte` ya está conectado al repo público y
tiene las variables del Supabase `tuemfuocmrysmtmfjqkk`. El enlace no despliega el commit que
ya estaba en `main`; el primer build sale con el siguiente push. Después: Google Auth, correos
en `admins`, y un proyecto de producción separado antes de cortar v1 (ADR-0017). Los umbrales
del bloqueo §2 siguen **Propuestos**.

Pendiente de sesiones anteriores, para retomar cuando toque:

- **`src/features/demo/` sigue sin retirarse.** ADR-0014 dice que se retira cuando la vista real de
  empleado exista — ya existe desde la Fase 3 — pero no se tocó por no ser parte del trabajo pedido;
  sigue montada en `/demo` y documentada en `docs/features/demo.md`.
- **390 px sin verificar pixel a pixel** en `/s/:slug` (Fase 3) ni en `/jefe/horario` (Fase 4;
  en jefatura el móvil mantiene scroll horizontal con el nombre fijo, plan §7.8-3, no una fila de dos
  líneas como en empleado).
- Marcar en `docs/diseno/pantallas.md` las capturas 01, 03, 04 y 10–14, 17 y 18 como revisadas
  cuando se haga esa comparación visual (hoy las Fases 3, 4 y 5 están probadas funcionalmente, no
  pixel-perfect).

Conviene cerrar el visto bueno de Ado a los ADR-0013, 0014 y 0016 (todos en **Propuesto**; ninguno
bloquea técnicamente, pero son desviaciones del plan que piden su ratificación).

### Hallazgos sobre la hoja real que quedan para después

- **No hay ninguna celda vacía ni ningún valor no reconocido** en las tres pestañas del archivo de
  octubre–diciembre. El parser sigue tolerándolos porque otro mes puede traerlos, pero no hay un caso
  real para probar la regla `valor-no-reconocido` hasta que aparezca uno.
- No existe la pestaña `CONTACTOS` en este archivo. Ignorarla sigue siendo correcto por defensa.
- Septiembre tiene 95 personas y 24 departamentos; octubre, 49 celdas `Vacaciones`.
- **ADR-0013** (Propuesto): un apellido con partícula (`FUENTES DE LEON NURIA`) rompía la regla de
  reparto del plan §5.5 y daba «De Leon Nuria Fuentes». Corregido y probado; falta el visto bueno.

## Bloqueos / preguntas abiertas

Las 4 del §13 del plan. **Ningún ADR que dependa de ellas pasa de «Propuesto»**, y nada que no
dependa de ellas se detiene por esto. No se asumen respuestas.

### 1. Acceso a la Google Sheet → bloquea [ADR-0005](adr/0005-acceso-a-google-sheet.md)

¿Coordinación puede compartir la hoja como «Cualquier persona con el enlace · Lector», o agregar
como lector el correo de una cuenta de servicio? Ninguna de las dos modifica la hoja.

Hoy la hoja está privada. Si ninguna opción es posible, el MVP queda **solo con Excel** y «Leer con
mi cuenta de Google» pasa a Próximamente. `api/hoja.ts` ya está escrito siguiendo el ADR, pero nunca
se probó contra una Google Sheet real porque esta pregunta sigue abierta; la pestaña correspondiente
en Fuente de datos queda marcada «Próximamente» mientras tanto.

### 2. Umbrales de las reglas de conflicto

Valores propuestos, pendientes de confirmar. Vivirán en `src/domain/config.ts`:

| Parámetro | Propuesto |
|---|---|
| Descanso mínimo entre turnos | 8 h (severidad alta por debajo) |
| Aviso de descanso justo | hasta 9 h (severidad baja) |
| Racha máxima de días seguidos | 7 |
| Hueco mínimo de cobertura | 60 min |
| Sedes que exigen supervisor en turno | Megacentro y Tuscania. ¿Atento, Santa Ana y San Miguel con su coordinación? |

La Fase 6 ya los usa tal cual, en `src/domain/config.ts`. Se pueden ajustar después porque son
parámetros, no estructura. Ver [datos/reglas-conflictos.md](datos/reglas-conflictos.md).

### 3. Corte con v1

El repo nuevo ya está decidido y en uso ([ADR-0001](adr/0001-repo-nuevo.md), Aceptado). El
procedimiento de corte está en [ADR-0017](adr/0017-corte-escalonado-de-v1.md) (**Propuesto**): aviso
en v1, transición y retiro de los `?s=<uuid>`, sin convertirlos a slugs de v2. Falta acordar la
URL estable de v2 y cuánto dura la transición. No se apaga v1 todavía.

### 4. Correos con acceso de jefatura

¿Qué correos van en la tabla `admins`? Se cargan por SQL siguiendo el runbook; **no van en el
repo**. Ya no bloquea el desarrollo: la Fase 2 se probó con un usuario de prueba contra el stack
local. Sí bloquea **producción**: hace falta antes de desplegar, para que jefatura pueda entrar de
verdad.
