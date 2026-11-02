# Progreso

Estado del MVP de ShiftSync v2. Se actualiza en **cada** cambio (Definición de terminado, §9.3).

| Fase | Qué incluye | Estado | Notas |
|---|---|---|---|
| 0 | Repo, herramientas y esqueleto de docs | **Hecho** | `check`, `docs:check` y `build` en verde |
| 1 | Dominio: leer la hoja | **Sin empezar — siguiente** | Opus |
| 2 | Base de datos, acceso de jefatura y Fuente de datos | Sin empezar | Opus. Necesita proyecto Supabase nuevo |
| 3 | Vista empleado + enlace de la operación | Sin empezar | Sonnet. **Primer entregable usable** |
| 4 | Horario completo | Sin empezar | Sonnet |
| 5 | Cambiar un día + registro de cambios | Sin empezar | Sonnet |
| 6 | Panel y conflictos | Sin empezar | Opus |
| 7 | Compartir completo | Sin empezar | Sonnet |
| 8 | Producción | Sin empezar | Opus, en sesión nueva (revisión independiente) |

## Último cambio

**2 nov 2026 · Fase 0 cerrada: repositorio, herramientas y documentación.**

Antes de empezar hubo que sanear el repositorio: estaba sin commits y las referencias de diseño
—con nombres y horarios reales— vivían dentro de `docs/` sin `.gitignore`. Un `git add .` las habría
publicado.

Qué quedó hecho:

- **Privacidad.** `.gitignore` con `referencias/`, `.env*` y los `.xlsx` que no son fixtures. Las
  referencias de diseño se movieron a `referencias/` en la raíz. Verificado con `git check-ignore`.
- **Repositorio.** Enlazado a `Doctorsv-Megacentro/shift-sync-soporte-tecnico`, rama `main`. v1
  clonado en `referencias/legado/` como referencia de solo lectura.
- **Andamiaje.** Vite + React 19 + TypeScript estricto + Tailwind v4, ESLint (con reglas que impiden
  que `src/domain` importe React o Supabase), Vitest y Playwright. Scripts `dev`, `build`, `check`,
  `test`, `e2e`, `docs:check`.
- **CI.** GitHub Actions: tipos, lint, pruebas, `docs:check`, compilación y auditoría de las
  dependencias de producción. Plantilla de PR con la Definición de terminado.
- **`scripts/check-docs.ts`** funcionando: detecta un `.md` sin enlazar, una feature sin ficha y un
  archivo sin comentario de cabecera, y sale con código 1.
- **Documentación.** El árbol completo del plan §9.1 y **doce ADR**. El plan quedó en un solo sitio,
  `docs/plan-implementacion.md` (había una copia idéntica duplicada).
- **Tokens de diseño** del plan §8 en `src/ui/tokens.css`.

**Nada se ha commiteado todavía:** el repositorio sigue sin su primer commit, a la espera del visto
bueno de Ado.

## Siguiente paso

**Fase 1 — Dominio: leer la hoja** (2–3 días, Opus). Arrancar con el prompt del Anexo B del plan,
más el extra de la Fase 1: antes de escribir el parser, leer `referencias/legado/src/lib/parser.ts`,
`utils.ts` y `location.ts`, y resumir en la ficha qué ideas se toman y qué cambia (§6.1).

Cubre `time`, `shift`, `names`, `catalog`, `workbook`, `validate` y `diff`, con fixtures sintéticos
construidos con SheetJS y `scripts/anonimizar-excel.ts`. Aceptación: los criterios del §6.5 que no
dependen de la base, y cobertura de `src/domain` ≥ 90 % de líneas.

Su ficha ya existe: [features/carga-horario.md](features/carga-horario.md).

### Listo para empezar

- **El Excel real está en `referencias/privado/`** (ignorado por git). Ya se puede generar el fixture
  anonimizado y correr `tests/local/`.
- **npm se queda en 10.9.2.** Decidido el 2 nov 2026: no se actualiza por ahora. Vitest queda en
  `~4.0` y la auditoría del CI cubre lo que se despliega. Ver
  [adr/0012-vulnerabilidades-de-desarrollo.md](adr/0012-vulnerabilidades-de-desarrollo.md).

### El contrato de la hoja, verificado contra el archivo real

Inspección estructural del libro de octubre–diciembre (2 nov 2026). **Los supuestos del plan §5.2 se
confirman**, lo que reduce el riesgo de la Fase 1:

| Qué | Esperado (plan) | Encontrado |
|---|---|---|
| Pestañas | 3, Septiembre oculta | ✓ Septiembre con `Hidden=1` |
| Septiembre | fechas desde la columna D; acaba con una columna de fórmula | ✓ columna D; acaba en `AH = "Libres por periodo"` |
| Octubre | 98 personas, 31 días | ✓ 98 y 31 |
| Noviembre | 103 personas, 26 departamentos, días 1–30 | ✓ 103, 26 y 30 |
| Noviembre | `Libre` 972, `Vacaciones` 73, `VACACIONES` 15 | ✓ 972, 73 y 15 |

Dos hallazgos que el plan no recogía:

- **No hay ninguna celda vacía ni ningún valor no reconocido** en las tres pestañas. El parser debe
  seguir tolerándolos (la hoja de otro mes puede traerlos), pero la regla `valor-no-reconocido` no
  tendrá casos con estos datos.
- No existe la pestaña `CONTACTOS` en este archivo. Ignorarla sigue siendo correcto por defensa.
- Septiembre tiene 95 personas y 24 departamentos; octubre, 49 celdas `Vacaciones`.

## Bloqueos / preguntas abiertas

Las 4 del §13 del plan. **Ningún ADR que dependa de ellas pasa de «Propuesto»**, y nada que no
dependa de ellas se detiene por esto. No se asumen respuestas.

### 1. Acceso a la Google Sheet → bloquea [ADR-0005](adr/0005-acceso-a-google-sheet.md)

¿Coordinación puede compartir la hoja como «Cualquier persona con el enlace · Lector», o agregar
como lector el correo de una cuenta de servicio? Ninguna de las dos modifica la hoja.

Hoy la hoja está privada. Si ninguna opción es posible, el MVP queda **solo con Excel** y «Leer con
mi cuenta de Google» pasa a Próximamente. *Las fases 0 y 1 no dependen de esto;* la 2 sí, para
`/api/hoja`.

### 2. Umbrales de las reglas de conflicto

Valores propuestos, pendientes de confirmar. Vivirán en `src/domain/config.ts`:

| Parámetro | Propuesto |
|---|---|
| Descanso mínimo entre turnos | 8 h (severidad alta por debajo) |
| Aviso de descanso justo | hasta 9 h (severidad baja) |
| Racha máxima de días seguidos | 7 |
| Hueco mínimo de cobertura | 60 min |
| Sedes que exigen supervisor en turno | Megacentro y Tuscania. ¿Atento, Santa Ana y San Miguel con su coordinación? |

Afecta a la Fase 6. Se puede implementar con los valores propuestos y ajustarlos después, porque
son parámetros, no estructura. Ver [datos/reglas-conflictos.md](datos/reglas-conflictos.md).

### 3. Corte con v1

El repo nuevo ya está decidido y en uso ([ADR-0001](adr/0001-repo-nuevo.md), Aceptado). Queda
pendiente: ¿cuándo se apaga `shiftsync-rho-neon.vercel.app` y qué pasa con los enlaces `?s=<uuid>`
ya repartidos, redirigir o retirar? Afecta a la Fase 8.

### 4. Correos con acceso de jefatura

¿Qué correos van en la tabla `admins`? Se cargan por SQL siguiendo el runbook; **no van en el
repo**. Afecta a la Fase 2.
