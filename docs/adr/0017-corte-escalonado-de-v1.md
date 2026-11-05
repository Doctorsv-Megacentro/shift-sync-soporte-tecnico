# 0017 — Preparar el corte escalonado de v1 a v2

- Estado: Propuesto
- Fecha: 2026-11-04
- Relacionado: Fase 8, [despliegue](../operacion/despliegue.md), ADR-0001

## Contexto

V1 debe seguir disponible hasta que jefatura valide v2. Sus enlaces `?s=<uuid>` no se pueden
convertir automáticamente en enlaces de v2: pertenecen a otra base y v2 usa enlaces con alcance y
vencimiento. Además, todavía no existen una URL estable de v2 ni proyectos Supabase en la nube.

## Decisión propuesta

Preparar un corte en dos pasos, sin ejecutarlo todavía:

1. cuando v2 tenga URL estable y pase la validación de jefatura, publicar en v1 un aviso que apunte
   al enlace vigente de v2, manteniendo los enlaces antiguos durante un período de transición;
2. al terminar ese período, retirar los enlaces `?s=<uuid>` de v1 y redirigir la entrada de v1 a la
   URL estable acordada para v2.

Antes de aplicar el cambio hay que acordar cuánto dura la transición y cuál URL de v2 será el
destino. Hasta entonces v1 no se modifica ni se redirige.

## Alternativas consideradas

- Redirigir ahora — no existe un destino estable y dejaría sin horario a quienes usan v1.
- Transformar cada UUID de v1 en un slug de v2 — las bases y los modelos de enlace no son
  compatibles; requeriría una migración de datos personales que no aporta valor al MVP.
- Apagar v1 en el mismo instante del lanzamiento — aumenta el riesgo y no cumple la validación
  previa con jefatura exigida por el plan.

## Consecuencias

El corte puede prepararse sin interrumpir el servicio. Durante la transición coexistirán dos
versiones y habrá que comunicar cuál enlace es el vigente. La decisión queda **Propuesta** porque
la duración y el destino dependen de la pregunta abierta §13.3 y de un despliegue que aún no existe.

## Cómo verificarlo

Antes del corte:

- v2 pasa el E2E contra su entorno de producción y jefatura confirma el flujo;
- la URL de destino abre sin autenticación el alcance público acordado;
- un enlace antiguo de v1 sigue funcionando durante la transición;
- después del corte, v1 dirige al destino acordado y no expone datos ni UUID antiguos.
