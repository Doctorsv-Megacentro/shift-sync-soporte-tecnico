# Catálogo de departamentos

Departamento → rol, sede y área. Fuente: plan §5.4. Decisión: [ADR-0009](../adr/0009-catalogo-en-codigo.md).

> **Estado: definido, pendiente de implementar** en `src/domain/catalog.ts` (**Fase 1**).

## Cómo se resuelve

1. **Coincidencia exacta normalizada** (sin tildes, mayúsculas, espacios simples) contra la tabla de
   abajo.
2. Si no hay, **reglas por prefijo y sufijo**.
3. Si tampoco, el departamento queda **desconocido**: `Sin sede`, rol `Otro`, y genera el conflicto
   `departamento-desconocido` (severidad media).

## Tabla explícita

| Departamento (como viene en la hoja) | Rol | Sede | Área |
|---|---|---|---|
| Coordinador Operaciones | Coordinador | — | Operación |
| Adminsitrador de Redes *(sic; alias de «Administrador de Redes»)* | Redes | Megacentro | |
| Activo Fijo | Activo Fijo | Megacentro | |
| SUP MEGA | Supervisor | Megacentro | |
| SUP CC | Supervisor | Tuscania | |
| Atencion Gestion Salas | Soporte de Salas | Megacentro | |
| MEGA N1 | N1 | Megacentro | |
| MEGA N2 | N2 | Megacentro | |
| CC N1 | N1 | Tuscania | |
| CC N2 | N2 | Tuscania | |
| Phoenix N1 | N1 | Phoenix Tower | |
| Phoenix N2 | N2 | Phoenix Tower | |
| AT N1 | N1 | Atento | |
| Coordinador de Producto | Coordinador | Megacentro | Producto |
| Supervisor Tercerias | Supervisor | Megacentro | Tercería |
| Especialistas de Producto | Producto | Megacentro | Producto |
| Tercerias | Tercería | Megacentro | Tercería |
| Especialistas de Redes | Redes | Megacentro | |
| Auxiliares de Red y Soporte | Redes | Megacentro | |
| Coordinador Santa Ana | Coordinador | Santa Ana | |
| N1 ST ANA | N1 | Santa Ana | |
| Coordinadora San Miguel | Coordinador | San Miguel | |
| N1 SAN MIGUEL | N1 | San Miguel | |
| Auxiliares de Red y Soporte-SM | Redes | San Miguel | |
| Soporte Tecnologico y Salas | Soporte de Salas | Phoenix Tower | |
| QA | QA | Megacentro | |
| Administrador de Redes | Redes | Megacentro | |

**Reasignación de sede (2026-11-05, petición de jefatura):** Atención Gestión Salas, Activo Fijo,
Administrador de Redes, Especialistas de Redes, Auxiliares de Red y Soporte, Coordinador de
Producto, Especialistas de Producto, QA, Supervisor Tercerias y Tercerias pasan a Megacentro;
Soporte Tecnologico y Salas pasa a Phoenix Tower. Como consecuencia, «Activo Fijo» deja de tener
departamentos propios y se retira de la lista de sedes (antes era una de las 7; ver «Los valores
posibles» abajo), y «Coordinador Operaciones» queda como el único departamento Sin sede.
«Auxiliares de Red y Soporte-SM» (la variante de San Miguel) no se tocó: sigue en San Miguel.

**«Adminsitrador de Redes» está mal escrito en la hoja original.** Se mantiene como alias para que
la carga no falle, y dispara el conflicto `departamento-mal-escrito` (baja), que propone corregir el
catálogo por PR. No se corrige la hoja: no se toca ([ADR-0003](../adr/0003-cambios-como-capa.md)).

## Reglas de respaldo

Vienen de `location.ts` de v1, ampliadas.

**Sede, por fragmento del nombre:**

| Fragmento | Sede |
|---|---|
| `MEGA` | Megacentro |
| `CC` | Tuscania |
| `PHOENIX` | Phoenix Tower |
| `AT` | Atento |
| `ST ANA`, `SANTA ANA` | Santa Ana |
| `SAN MIGUEL`, `SM`, `-SM` | San Miguel |

**Rol, por fragmento:**

| Fragmento | Rol |
|---|---|
| `SUP` | Supervisor |
| `N1` | N1 |
| `N2` | N2 |
| `COORDINADOR`, `COORDINADORA` | Coordinador |

## Los valores posibles

**Roles (10):** N1, N2, Supervisor, Coordinador, Producto, Tercería, Redes, Soporte de Salas, QA,
Activo Fijo. Más `Otro` para lo desconocido.

**Sedes (6 + 1):** Megacentro, Tuscania, Phoenix Tower, Atento, Santa Ana, San Miguel, y **Sin sede**.
«Activo Fijo» ya no es una sede: era la única que usaba el departamento Activo Fijo, y ese
departamento pasó a Megacentro.

«Sin sede» no es un error: Coordinador Operaciones es transversal y no pertenece a una sede física.
Se muestra con una etiqueta más tenue.

## Cómo verificarlo

Pruebas de `catalog.ts` con los 26 departamentos del libro real, uno desconocido y uno mal escrito.
Noviembre debe dar **26 departamentos y 6 sedes más «Sin sede»** (plan §6.5; sedes actualizado el
2026-11-05, ver nota arriba).
