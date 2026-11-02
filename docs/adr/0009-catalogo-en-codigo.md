# 0009 — El catálogo de departamentos vive en código y en git

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0007](0007-conflictos-como-funciones-puras.md), plan §5.4

## Contexto

La columna A de la hoja trae el departamento tal cual (`MEGA N1`, `SUP CC`, `N1 ST ANA`…). De ahí
salen tres cosas que el producto necesita: el **rol** (N1, N2, Supervisor, Coordinador…), la **sede**
(Megacentro, Tuscania, Phoenix Tower…) y el **área**. Son 26 departamentos y 7 sedes.

Ese mapeo cambia poco: un departamento nuevo aparece cuando se abre una sede o se crea un equipo.

## Decisión

El catálogo vive en `src/domain/catalog.ts`, en código y en git. Se resuelve en tres pasos:

1. Coincidencia **exacta normalizada** contra la tabla explícita (plan §5.4).
2. Si no hay, **reglas por prefijo y sufijo** (`MEGA`→Megacentro, `SUP`→Supervisor, `-SM`→San
   Miguel…), ampliadas desde `location.ts` de v1.
3. Si tampoco, el departamento queda **desconocido**: `Sin sede`, rol `Otro`, y **genera un
   conflicto** (`departamento-desconocido`, media).

## Alternativas consideradas

- **Tabla editable en la base** — más flexible, pero un cambio de catálogo pasaría sin revisión ni
  pruebas, y el catálogo afecta a las reglas de conflicto. Queda para después.

## Consecuencias

- Un departamento nuevo se añade en un PR: se revisa y se prueba antes de llegar a producción.
- El conflicto `departamento-desconocido` avisa en el panel en cuanto la hoja trae algo que el
  catálogo no conoce, así que nada pasa desapercibido.
- Se contempla el error de escritura: «Adminsitrador de Redes» está en el catálogo como alias y
  dispara `departamento-mal-escrito` (baja), que propone abrir un PR al catálogo.
- Se acepta que cambiar el catálogo exige un despliegue.

## Cómo verificarlo

Pruebas de `catalog.ts` con los 26 departamentos reales (anonimizados en el fixture), uno
desconocido y uno mal escrito. El criterio del plan §6.5 exige que noviembre dé **26 departamentos
y 7 sedes más «Sin sede»**.
