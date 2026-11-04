# Índice de la documentación

«Si quieres saber X → mira Y». Todo `.md` de `docs/` está enlazado aquí; `npm run docs:check` lo
valida en local y en CI.

## Empieza por aquí

| Si quieres saber… | Mira |
|---|---|
| En qué fase vamos, qué sigue y qué está bloqueado | [progreso.md](progreso.md) |
| Qué construimos, para quién, y el glosario del producto | [producto/prd.md](producto/prd.md) |
| El plan completo del MVP, fase por fase | [plan-implementacion.md](plan-implementacion.md) |
| Las reglas de trabajo para Claude Code | [../CLAUDE.md](../CLAUDE.md) |
| Qué cambió y cuándo | [../CHANGELOG.md](../CHANGELOG.md) |

## Producto

| Tema | Documento |
|---|---|
| Alcance del MVP, los dos públicos, principios y glosario | [producto/prd.md](producto/prd.md) |
| Qué se muestra apagado y por qué quedó fuera | [producto/proximamente.md](producto/proximamente.md) |

## Arquitectura

| Tema | Documento |
|---|---|
| Las capas, el flujo de datos, dónde vive cada cosa | [arquitectura/vision-general.md](arquitectura/vision-general.md) |
| Tablas, RLS, funciones RPC y diagrama ER | [arquitectura/modelo-de-datos.md](arquitectura/modelo-de-datos.md) |
| Quién ve qué, los enlaces, `/api/hoja` y los riesgos aceptados | [arquitectura/seguridad.md](arquitectura/seguridad.md) |

## Datos y reglas de negocio

| Tema | Documento |
|---|---|
| Cómo debe venir la hoja y cómo se interpreta una celda | [datos/formato-hoja.md](datos/formato-hoja.md) |
| Departamento → rol, sede, área | [datos/catalogo-departamentos.md](datos/catalogo-departamentos.md) |
| Las 16 reglas de conflicto, con umbrales y casos de control | [datos/reglas-conflictos.md](datos/reglas-conflictos.md) |

## Funcionalidades

Una ficha por carpeta de `src/features/`. `docs:check` falla si falta alguna.

| Funcionalidad | Ficha |
|---|---|
| Carga del horario (Excel y Google Sheet) | [features/carga-horario.md](features/carga-horario.md) |
| Fuente de datos (subir, publicar, historial, acceso de jefatura) | [features/fuente.md](features/fuente.md) |
| Demo local de la vista de empleado (desechable, ADR-0014) | [features/demo.md](features/demo.md) |

Pendientes, según se construyan: `empleado`, `panel`, `horario`, `compartir`.

## Diseño

| Tema | Documento |
|---|---|
| Tipografía, colores, forma y componentes base | [diseno/tokens.md](diseno/tokens.md) |
| Cada pantalla → su captura de referencia y las diferencias permitidas | [diseno/pantallas.md](diseno/pantallas.md) |

## Decisiones (ADR)

Nunca se borra un ADR: se marca *Reemplazado por NNNN*. Plantilla:
[adr/0000-plantilla.md](adr/0000-plantilla.md).

| ADR | Decisión | Estado |
|---|---|---|
| [0001](adr/0001-repo-nuevo.md) | Repo nuevo; v1 queda como referencia de solo lectura | Aceptado |
| [0002](adr/0002-stack.md) | Stack: React 19 + TS + Vite + Tailwind v4, Supabase, Vercel | Aceptado |
| [0003](adr/0003-cambios-como-capa.md) | Los cambios de jefatura son una capa; la hoja no se toca | Aceptado |
| [0004](adr/0004-un-solo-camino-de-lectura.md) | Un solo camino de lectura: todo entra como `.xlsx` | Aceptado |
| [0005](adr/0005-acceso-a-google-sheet.md) | Acceso a la Google Sheet por enlace de solo lectura | **Propuesto** |
| [0006](adr/0006-acceso-de-empleados-y-jefatura.md) | Jefatura con Google y lista permitida; empleados por enlace | Aceptado |
| [0007](adr/0007-conflictos-como-funciones-puras.md) | Los conflictos son funciones puras | Aceptado |
| [0008](adr/0008-tiempo-fechas-locales-y-minutos.md) | Fechas locales y minutos; `00:00` no cruza | Aceptado |
| [0009](adr/0009-catalogo-en-codigo.md) | El catálogo de departamentos vive en código | Aceptado |
| [0010](adr/0010-versiones-de-importacion.md) | Versiones de importación, con vuelta atrás | Aceptado |
| [0011](adr/0011-datos-personales-fuera-del-repo.md) | Datos personales fuera del repo | Aceptado |
| [0012](adr/0012-vulnerabilidades-de-desarrollo.md) | Vitest en `~4.0`; auditoría acotada a producción | Aceptado |
| [0013](adr/0013-apellido-con-particula.md) | Un grupo que empieza por partícula es siempre apellido | **Propuesto** |
| [0014](adr/0014-demo-local-antes-de-fase-2.md) | Demo local de la vista de empleado, antes de la Fase 2 | **Propuesto** |
| [0015](adr/0015-enrutador.md) | Enrutador: React Router | Aceptado |

## Operación (runbooks)

| Si necesitas… | Runbook |
|---|---|
| Configurar o rotar variables y claves | [operacion/variables-entorno.md](operacion/variables-entorno.md) |
| Desplegar a *preview* o a producción | [operacion/despliegue.md](operacion/despliegue.md) |
| Crear o aplicar una migración | [operacion/migraciones.md](operacion/migraciones.md) |
| **Cargar el horario del mes** (procedimiento de jefatura) | [operacion/cargar-mes.md](operacion/cargar-mes.md) |
| Volver atrás: datos, código o esquema | [operacion/volver-atras.md](operacion/volver-atras.md) |
| Respaldar y restaurar la base | [operacion/respaldo.md](operacion/respaldo.md) |
| **Resolver una avería** | [operacion/incidentes.md](operacion/incidentes.md) |

## Fuera de `docs/`: el diseño aprobado

`referencias/diseno/` está en `.gitignore` porque contiene **nombres y horarios reales**
([ADR-0011](adr/0011-datos-personales-fuera-del-repo.md)). Trae las 19 capturas de referencia y los
6 mockups `.dc.html` con los textos literales de la interfaz; su propio `README.md` explica qué
mirar en cada archivo. Lo que sí puede entrar al repo está transcrito en
[diseno/tokens.md](diseno/tokens.md) y [diseno/pantallas.md](diseno/pantallas.md), sin datos
personales.

`referencias/legado/` es el clon de solo lectura de v1. No se copian archivos de ahí: se reescribe
la idea y se cita el origen en la ficha.
