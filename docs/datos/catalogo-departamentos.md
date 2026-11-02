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
| Adminsitrador de Redes *(sic; alias de «Administrador de Redes»)* | Redes | — | |
| Activo Fijo | Activo Fijo | Activo Fijo | |
| SUP MEGA | Supervisor | Megacentro | |
| SUP CC | Supervisor | Tuscania | |
| Atencion Gestion Salas | Soporte de Salas | — | |
| MEGA N1 | N1 | Megacentro | |
| MEGA N2 | N2 | Megacentro | |
| CC N1 | N1 | Tuscania | |
| CC N2 | N2 | Tuscania | |
| Phoenix N1 | N1 | Phoenix Tower | |
| Phoenix N2 | N2 | Phoenix Tower | |
| AT N1 | N1 | Atento | |
| Coordinador de Producto | Coordinador | — | Producto |
| Supervisor Tercerias | Supervisor | — | Tercería |
| Especialistas de Producto | Producto | — | |
| Tercerias | Tercería | — | |
| Especialistas de Redes | Redes | — | |
| Auxiliares de Red y Soporte | Redes | — | |
| Coordinador Santa Ana | Coordinador | Santa Ana | |
| N1 ST ANA | N1 | Santa Ana | |
| Coordinadora San Miguel | Coordinador | San Miguel | |
| N1 SAN MIGUEL | N1 | San Miguel | |
| Auxiliares de Red y Soporte-SM | Redes | San Miguel | |
| Soporte Tecnologico y Salas | Soporte de Salas | — | |
| QA | QA | — | |

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

**Sedes (7 + 1):** Megacentro, Tuscania, Phoenix Tower, Atento, Santa Ana, San Miguel, Activo Fijo,
y **Sin sede**.

«Sin sede» no es un error: hay departamentos transversales (coordinación, producto, redes, QA) que
no pertenecen a una sede física. Se muestra con una etiqueta más tenue.

## Cómo verificarlo

Pruebas de `catalog.ts` con los 26 departamentos del libro real, uno desconocido y uno mal escrito.
Noviembre debe dar **26 departamentos y 7 sedes más «Sin sede»** (plan §6.5).
