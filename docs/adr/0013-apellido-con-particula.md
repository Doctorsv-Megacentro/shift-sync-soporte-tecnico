# 0013 — Un grupo que empieza por partícula es siempre un apellido

- Estado: **Propuesto**
- Fecha: 2026-11-02
- Relacionado: [ADR-0001](0001-repo-nuevo.md), plan §5.5, docs/features/carga-horario.md

> **Este ADR refina una regla del plan.** Necesita el visto bueno de Ado. El
> cambio ya está implementado y probado porque sin él la vista de empleado
> muestra nombres visiblemente mal.

## Contexto

El plan §5.5 reparte los grupos de un nombre en mayúsculas entre apellidos y
nombres **según cuántos grupos haya**: 2 grupos → 1 apellido + 1 nombre; 3 → 1 + 2;
4 → 2 + 2; 5 o más → 2 apellidos y el resto nombres.

Esa regla funciona mientras el número de grupos coincida con la estructura del nombre, pero falla
cuando un apellido lleva partícula y hay un solo nombre de pila:

| En la hoja | Grupos | Regla del plan | Resultado | Correcto |
|---|---|---|---|---|
| `CRUZ DE MOLINA SOFIA ELENA` | `CRUZ` · `DE MOLINA` · `SOFIA` · `ELENA` | 4 → 2 + 2 | «Sofia Elena Cruz de Molina» | ✅ |
| `FUENTES DE LEON NURIA` | `FUENTES` · `DE LEON` · `NURIA` | 3 → 1 + 2 | «**De Leon Nuria Fuentes**» | ❌ «Nuria Fuentes de Leon» |

El segundo caso parte el apellido `DE LEON` y lo coloca como primer nombre. Es un error que cualquier
persona ve de inmediato en su propio horario, y la hoja real tiene apellidos con partícula.

## Decisión

Se mantiene el reparto por conteo del plan, y después se **extiende** el número de apellidos mientras
el siguiente grupo empiece por una partícula:

```
cuantosApellidos = regla del plan por número de grupos
mientras el grupo en esa posición empiece por partícula:
    cuantosApellidos++
```

El fundamento: en español las partículas (`de`, `del`, `de la`, `de los`, `y`) aparecen en los
apellidos, prácticamente nunca al principio de un nombre de pila. Un grupo que empieza por partícula
no puede ser el primer nombre.

## Alternativas consideradas

- **Seguir el plan al pie de la letra** — produce nombres visiblemente incorrectos. El plan es un
  documento vivo y esto es justo lo que un ADR debe corregir.
- **Pedir a jefatura que corrija cada nombre a mano** — existe esa opción en el producto
  (`display_name_source = 'manual'`), pero usarla como solución de base significaría corregir a mano
  una parte de las ~100 personas en cada importación.
- **Una lista de apellidos conocidos** — más preciso, pero exige mantener una lista con datos reales,
  que es lo que el ADR-0011 prohíbe.

## Consecuencias

- Los apellidos con partícula se muestran bien sin intervención de nadie.
- No cambia ninguno de los casos que el plan ya resolvía bien: la extensión solo actúa cuando el
  grupo siguiente empieza por partícula, y las pruebas de los ejemplos del plan siguen pasando.
- La clave estable **no se toca**: sigue siendo los tokens ordenados alfabéticamente, así que este
  cambio no altera la identidad de nadie ni rompe los cambios de jefatura ya guardados.
- Queda un caso que ninguna regla automática resuelve: un nombre de pila que empiece por partícula.
  Para eso está la corrección manual de jefatura.

## Cómo verificarlo

En `tests/domain/names.test.ts`, el caso «un apellido con partícula no se confunde con un nombre»:

```
FUENTES DE LEON NURIA   → «Nuria Fuentes de Leon»
RAMOS DE LA PAZ ANA  → «Ana Ramos de la Paz»
```

Y los ejemplos literales del plan siguen verdes: `CRUZ DE MOLINA SOFIA ELENA` →
«Sofia Elena Cruz de Molina».
