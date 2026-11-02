# PRD — Alcance del MVP

Qué construimos, para quién y con qué palabras lo llamamos. Fuente: plan §1 y §5.1.

## El problema

El horario mensual de la operación (~100 personas, 26 departamentos, 7 sedes) vive en una hoja que
arma coordinación. Para saber cuándo trabajas hay que abrirla y buscarte entre un centenar de filas;
para saber **quién más está ese día** —lo que de verdad hace falta para apoyarse entre áreas— hay
que leerla en cruz. Y cuando jefatura cambia el día de alguien, ese cambio no llega a la hoja: se
queda en un mensaje.

## Los dos públicos

| Público | Qué puede hacer en el MVP | Cómo entra |
|---|---|---|
| **Empleado** | Buscar su nombre, ver su semana y su día, ver **quién está ese día** (mismo horario / su equipo / toda la operación), ver si jefatura le cambió un día | Enlace de solo lectura que comparte jefatura. Sin cuenta |
| **Jefatura** | Cargar el horario (Excel o enlace de Google Sheet), ver el panel con **conflictos** y resolverlos, ver el horario completo, **cambiar un día** (turno, sede, compañero de apoyo, motivo y nota), deshacer cambios y **generar enlaces** para compartir | Google (Supabase Auth) + lista de correos permitidos |

Todo lo demás aparece en la interfaz como **Próximamente**: visible, deshabilitado, sin
comportamiento falso. Ver [proximamente.md](proximamente.md).

## Principios no negociables

1. **La hoja es la fuente de verdad y nunca se escribe en ella.** Los cambios de jefatura son una
   capa guardada en la base que se aplica encima del horario leído ([ADR-0003](../adr/0003-cambios-como-capa.md)).
2. **Nada está terminado sin documentación.** Cada decisión lleva un ADR y cada funcionalidad su
   ficha. Cada cambio entra en el CHANGELOG.
3. **Reinicio limpio.** El repo anterior se lee para entender cómo funcionaba. No se copian
   archivos: se reescribe tomando la idea y se cita el origen ([ADR-0001](../adr/0001-repo-nuevo.md)).
4. **La lógica de negocio es pura y probada.** Vive en `src/domain/`, sin React ni Supabase.
5. **Ningún dato personal real en el repo** ([ADR-0011](../adr/0011-datos-personales-fuera-del-repo.md)).
6. **$0.** Si una pieza no cabe en una capa gratuita, se discute en un ADR antes de usarla.
7. **Fidelidad al diseño.** Estructura, textos, colores y comportamiento como en las capturas.

## Glosario

El vocabulario del producto y su equivalente en código. Usar estos términos en la interfaz, en la
documentación y al hablar del proyecto.

| Término | En código | Significado |
|---|---|---|
| Hoja / libro | `Workbook` | El Excel o la Google Sheet completos. Trae una pestaña por mes |
| Turno | `ShiftValue{kind:'work'}` | Celda `HH:MM-HH:MM`. Puede terminar al día siguiente |
| Libre | `kind:'off'` | Día de descanso |
| Vacaciones | `kind:'vacation'` | Cualquier variante de «vacaciones» |
| Sin dato | `kind:'unknown'` | Vacío o valor no reconocido. Siempre genera aviso |
| Departamento | `Department` | Columna A tal como viene (ej. `MEGA N1`) |
| Rol | `Role` | N1, N2, Supervisor, Coordinador, Producto, Tercería, Redes, Soporte de Salas, QA, Activo Fijo |
| Sede | `Site` | Megacentro, Tuscania, Phoenix Tower, Atento, Santa Ana, San Miguel, Activo Fijo, o *Sin sede* |
| Cambio de jefatura | `DayOverride` | Reemplazo de un día de una persona, con motivo y nota |
| Horario efectivo | `EffectiveDay` | Hoja + cambios de jefatura. Es lo que se muestra y lo que revisan las reglas |
| Conflicto | `Conflict` | Incoherencia que detecta una regla, con severidad alta, media o baja |
| Enlace | `ShareLink` | URL de solo lectura con alcance, vencimiento y revocación |

## Qué no es el MVP

No es un sistema de marcaje, ni de nómina, ni de solicitudes de vacaciones. No escribe en la hoja.
No sustituye a coordinación: la ayuda a que su trabajo se lea bien.
