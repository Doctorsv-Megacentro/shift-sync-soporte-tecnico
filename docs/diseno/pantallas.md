# Pantallas y capturas de referencia

Cada pantalla, su ruta y la captura contra la que se compara. Fuente: plan §7.

Las capturas viven en `referencias/diseno/capturas/`, que **no está en el repo**
([ADR-0011](../adr/0011-datos-personales-fuera-del-repo.md)). Los mockups `.dc.html` del mismo
paquete tienen los **textos literales** de la interfaz: se copian tal cual.

> **Estado: ninguna pantalla implementada.** Se construyen de la Fase 2 a la 7.

## Lista de verificación visual

Esta tabla es la revisión manual de fidelidad (plan §11, nivel «Visual»). Se marca al cerrar cada
fase.

| Pantalla | Ruta | Captura | Mockup | Fase | ¿Revisada? |
|---|---|---|---|---|---|
| Empleado · su día | `/s/:slug` | `01-empleado-mi-dia.png` | `Empleado.dc.html` | 3 | ☐ |
| Empleado · día cambiado por jefatura | `/s/:slug` | `02-empleado-dia-cambiado-por-jefatura.png` | `Empleado.dc.html` | 5 | ☐ |
| Empleado · toda la operación | `/s/:slug` | `03-empleado-toda-la-operacion.png` | `Empleado.dc.html` | 3 | ☐ |
| Empleado · buscar persona | `/s/:slug` | `04-empleado-buscar-persona.png` | `Empleado.dc.html` | 3 | ☐ |
| Empleado · móvil 390 px | `/s/:slug` | `05-empleado-movil.png` | `Empleado.dc.html` | 3 | ☐ |
| Jefe · Fuente · Google Sheet | `/jefe/fuente` | `06-jefe-fuente-google-sheet.png` | `Fuente.dc.html` | 2 | ☐ |
| Jefe · Fuente · subir Excel | `/jefe/fuente` | `07-jefe-fuente-excel.png` | `Fuente.dc.html` | 2 | ☐ |
| Jefe · Panel y conflictos | `/jefe/panel` | `08-jefe-panel-conflictos.png` | `DashOps.dc.html` | 6 | ☐ |
| Jefe · conflicto con opción elegida | `/jefe/panel` | `09-jefe-conflicto-opcion-elegida.png` | `DashOps.dc.html` | 6 | ☐ |
| Jefe · Horario · Semana | `/jefe/horario` | `10-jefe-horario-semana.png` | `GridOps.dc.html` | 4 | ☐ (funcional, falta revisión pixel a pixel — ADR-0016) |
| Jefe · Cambiar un día (inicial) | `/jefe/horario` | `11-jefe-editar-dia.png` | `GridOps.dc.html` | 5 | ☐ |
| Jefe · Cambiar un día con datos | `/jefe/horario` | `12-jefe-editar-dia-con-cambios.png` | `GridOps.dc.html` | 5 | ☐ |
| Jefe · cambio guardado | `/jefe/horario` | `13-jefe-cambio-guardado.png` | `GridOps.dc.html` | 5 | ☐ |
| Jefe · alerta de descanso | `/jefe/horario` | `13b-jefe-editar-dia-alerta-descanso.png` | `GridOps.dc.html` | 5 | ☐ |
| Jefe · Registro de cambios | `/jefe/horario` | `14-jefe-registro-de-cambios.png` | `GridOps.dc.html` | 5 | ☐ |
| Jefe · Compartir | `/jefe/compartir` | `15-jefe-compartir.png` | `GridOps.dc.html` | 7 | ☐ |
| Jefe · enlace copiado | `/jefe/compartir` | `16-jefe-compartir-copiado.png` | `GridOps.dc.html` | 7 | ☐ |
| Jefe · vista rápida de persona | `/jefe/horario` | `17-jefe-vista-rapida-persona.png` | `GridOps.dc.html` | 4 | ☐ (funcional, falta revisión pixel a pixel — ADR-0016) |
| Jefe · Horario · Día | `/jefe/horario` | `18-jefe-horario-dia.png` | `GridOps.dc.html` | 4 | ☐ (funcional, falta revisión pixel a pixel — ADR-0016) |

## Diferencias aceptadas entre el mockup y la implementación

Son las únicas permitidas sin ADR (plan §7.8). Cualquier otra desviación lleva ADR.

1. **«Publicar esta versión»** aparece explícito en el resumen de lectura. El mockup ya dice
   «conflictos para revisar antes de publicar»; aquí se hace un botón.
2. **Frecuencia automática** de revisión de la hoja («cada 15 min», «cada hora») queda como
   **Próximamente**: necesita un cron.
3. **Móvil:**
   - la tira semanal muestra solo la hora de entrada y un punto de color por día (en el mockup se
     corta — es el problema conocido de la captura 05);
   - la lista «Quién está» pasa a dos líneas (nombre / rol · sede · horario), sin scroll horizontal;
   - en jefatura, la tabla semanal mantiene scroll horizontal con el nombre fijo.
4. **Datos vivos:** conflictos, horarios rápidos, compañeros y métricas se **calculan**. En el
   mockup varios estaban escritos a mano. En particular, los 12 conflictos de `DashOps.dc.html`
   están a mano: la implementación los calcula con las reglas de
   [../datos/reglas-conflictos.md](../datos/reglas-conflictos.md).
5. **Seguridad del enlace:** slug aleatorio largo en lugar del hash corto del mockup, y el dominio
   real en lugar del ficticio `shiftsync.app`.

## Cómo leer un mockup `.dc.html`

No se abren solos en el navegador (necesitan el runtime de claude.ai), pero se leen bien como texto:

- `<helmet><style>`: las clases y los colores exactos (`.k-m`, `.ro-n1`, `.gb-sup`, `.sev-alta`…).
- El HTML con huecos, `<sc-for>` y `<sc-if>`: la estructura y los **textos literales**.
- `class Component … renderVals()`: la lógica de la maqueta (parseo de turnos, agrupaciones,
  filtros, avisos de descanso, enlaces).

El `README.md` dentro de `referencias/diseno/` detalla qué mirar en cada archivo.
