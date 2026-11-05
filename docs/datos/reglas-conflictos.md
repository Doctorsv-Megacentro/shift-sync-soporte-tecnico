# Reglas de conflicto

Las 16 reglas del panel de jefatura. Fuente: plan §7.3. Decisión:
[ADR-0007](../adr/0007-conflictos-como-funciones-puras.md).

> **Estado: implementado** en la **Fase 6**. Un archivo por regla en `src/domain/conflicts/`, con
> sus pruebas. Los parámetros viven en `src/domain/config.ts`. Ficha: [../features/panel.md](../features/panel.md).
>
> ⚠️ **Los umbrales están pendientes de confirmar** por Ado: ver `../progreso.md`, bloqueo 2.

## Cómo funcionan

Los conflictos **no se guardan**: son funciones puras sobre el horario efectivo (hoja + cambios).

- **Resolver** = crear un `day_override` que hace que la regla deje de cumplirse. El conflicto
  desaparece solo.
- **«Aceptar como está»** = una fila en `conflict_acks` con nota. Es lo único que se persiste.
- Ambos se asocian por la **clave estable** `regla:alcance`, por ejemplo
  `cobertura-supervision:tuscania:2026-11-02:14:00-18:00`.

Una tarjeta por regla y por caso relevante. Los casos repetidos se agrupan: «se repite en 16 días
más del mes».

## Parámetros

| Parámetro | Valor propuesto | Dónde se cambia |
|---|---|---|
| `DESCANSO_MIN_H` | 8 h | `src/domain/config.ts` |
| `DESCANSO_AVISO_H` | 9 h | `src/domain/config.ts` |
| `RACHA_MAX` | 7 días | `src/domain/config.ts` |
| `HUECO_MIN` | 60 min | `src/domain/config.ts` |
| `SEDES_CON_SUPERVISION` | Megacentro → `SUP MEGA`, Tuscania → `SUP CC` | `src/domain/config.ts` |

## Las reglas

### Severidad alta

| id | Tipo | Se dispara cuando… | Opciones / acción |
|---|---|---|---|
| `cobertura-supervision` | Cobertura | En una sede de `SEDES_CON_SUPERVISION` hay ≥1 N1/N2 de esa sede en turno y **0 supervisores** de esa sede, durante ≥ `HUECO_MIN` | Supervisores libres ese día (todos menos `Supervisor Tercerias`) más `Coordinador Operaciones` → «Asignar cobertura» crea un cambio con ese horario y esa sede |
| `descanso-corto` | Descanso | Entre el fin de un turno y el inicio del siguiente de la misma persona hay < `DESCANSO_MIN_H` | Ir al horario y editar · Aceptar |

### Severidad media

| id | Tipo | Se dispara cuando… | Opciones / acción |
|---|---|---|---|
| `racha-larga` | Descanso | ≥ `RACHA_MAX` días seguidos con turno | Editar · Aceptar |
| `sede-sin-supervision` | Estructura | Una sede tiene N1/N2 pero **ningún departamento de supervisor** (hoy Phoenix Tower) | Aceptar con nota |
| `hueco-equipo` | Cobertura | Un departamento N1/N2 queda con 0 personas ≥ 60 min dentro de su **ventana habitual** (la unión de sus turnos del mes) | Ir al horario · Aceptar |
| `valor-no-reconocido` | Formato | Una celda queda como `unknown` | Editar el día · Aceptar |
| `persona-duplicada` | Estructura | Dos filas con la misma clave estable en un mes | Aceptar |
| `cambio-huerfano` | Cambios | Un cambio vigente sobre una persona o fecha que ya no está en la hoja | Archivar cambio |
| `departamento-desconocido` | Formato | Un departamento sin entrada en el catálogo | Informativo; propone PR al catálogo |

### Severidad baja

| id | Tipo | Se dispara cuando… | Opciones / acción |
|---|---|---|---|
| `descanso-justo` | Descanso | El descanso está entre `DESCANSO_MIN_H` y `DESCANSO_AVISO_H` | «Aceptar regla de 8 h mínimo» |
| `fecha-en-nombre` | Formato | El nombre trae un sufijo `(d/m)` | Informativo: se interpreta como fecha de ingreso |
| `vacaciones-mayusculas` | Formato | Variantes de «Vacaciones» en la misma hoja | Informativo |
| `nombre-con-coma` | Formato | Nombre en formato `APELLIDOS, NOMBRES` | Informativo |
| `departamento-mal-escrito` | Formato | Coincide con un alias conocido (ej. «Adminsitrador») | Informativo; propone PR al catálogo |
| `orden-nombre-dudoso` | Formato | `needsReview`: el primer grupo del nombre está en la lista de nombres comunes y el último no | Chips «Nombre primero» / «Apellido primero» → guarda nombre manual |
| `cambios-vs-mes-anterior` | Cambios | Hay ingresos, salidas o movimientos de departamento | Informativo |
| `cambio-ya-en-hoja` | Cambios | La hoja nueva ya trae el valor del cambio | Archivar cambio |

## Casos de control

Con el libro real (prueba local, se salta si no hay `referencias/privado/`), el panel debe encontrar
**al menos**:

- Tuscania sin supervisor el lunes 2 de noviembre, 14:00–18:00;
- Megacentro sin supervisor el martes 3, 06:00–15:00;
- 4 descansos de 6 h en Soporte de Salas (sale 00:00, entra 06:00);
- una racha de 9 días (5–13 nov) y otra de 7 (9–15 nov);
- Phoenix Tower sin supervisión;
- CC N1 sin N1 el jueves 19 de 06:00 a 21:00, y CC N2 sin N2 el miércoles 18 de 14:00 a 21:00;
- 6 ingresos con `(3/11)`;
- 15 celdas `VACACIONES`;
- un nombre con coma;
- «Adminsitrador de Redes»;
- 12 cambios de departamento y 1 salida contra octubre;
- descansos justos de noviembre: la fórmula da **12** (8 h o más y menos de 9 h, entre días
  seguidos trabajados). El «17» del plan no aparece en esta hoja; hay además 1 descanso de 9 h
  exactas, que no entra en la regla.

## Métricas de referencia (lunes 2 de noviembre)

Sirven de prueba de regresión del panel.

- **En turno** 73 de 103 · **libres** 29 · **vacaciones** 1 · **cruzan medianoche** 9.
- **Franjas:** Mañana 33 · Día 8 · Tarde 23 · Noche 9.
- **Por sede** (en turno / total): Megacentro 39/54 · Tuscania 12/18 · Phoenix Tower 11/18 ·
  Santa Ana 5/5 · San Miguel 4/5 · Atento 1/2 · Sin sede 1/1. (Cifras tras la reasignación de sede
  del 2026-11-05: ver `docs/datos/catalogo-departamentos.md`.)

«En turno» cuenta los turnos que **empiezan** ese día.

## Cómo verificarlo

Una prueba por regla, con su caso positivo y su negativo, sobre fixtures sintéticos. Los casos de
control se verifican con el fixture anonimizado. Resolver un `cobertura-supervision` debe crear el
`day_override` y hacer que el conflicto pase a Resueltos sin tocar ninguna tabla de conflictos.
