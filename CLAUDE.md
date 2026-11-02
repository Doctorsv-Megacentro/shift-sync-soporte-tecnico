# CLAUDE.md — ShiftSync v2

ShiftSync lee el horario mensual de la operación (Excel o Google Sheet; ~100 personas,
26 departamentos, 7 sedes) y lo muestra a **empleados** (por enlace de solo lectura, sin cuenta)
y a **jefatura** (Google + lista de correos permitidos), con conflictos, cambios de un día y
enlaces para compartir.

**Plan completo y vivo: `docs/plan-implementacion.md`.** Es la fuente de verdad de este proyecto.
Si algo se decide distinto durante la implementación, se escribe un ADR y se actualiza el plan en
el mismo cambio.

**Estado: Fase 0 sin empezar.** Todavía no hay código ni `package.json`. Lo que existe es el plan,
las referencias de diseño y esta documentación. Ver `docs/progreso.md`.

## Antes de empezar cualquier tarea

1. Lee `docs/progreso.md` y la fase correspondiente del plan.
2. Si tocas una funcionalidad, lee su ficha en `docs/features/` y los ADR que enlaza.
3. Diseño: `referencias/diseno/` (capturas + mockups `.dc.html`).
   Repo anterior, solo lectura: `referencias/legado/`.
4. Trabaja en **modo plan**: propone archivos, decisiones (¿ADR?) y pruebas, y espera visto bueno.

El prompt de arranque de cada fase está en el Anexo B del plan.

## Comandos

Llegan con la Fase 0. Una vez exista `package.json`:

```
npm run dev | npm run check | npm run test | npm run e2e | npm run docs:check
```

`npm run check` = tipos + lint + pruebas. Es la puerta de entrada de cualquier PR.

## Reglas

- **La hoja nunca se modifica.** Los cambios de jefatura son una capa `day_overrides` sobre el
  horario importado (ADR-0003).
- **Lógica de negocio solo en `src/domain/`**: TypeScript puro, sin React ni Supabase, y siempre
  con pruebas unitarias.
- **Supabase solo desde `src/data/`.** La `SUPABASE_SERVICE_ROLE_KEY` vive solo en `/api`,
  **nunca** con prefijo `VITE_`.
- **No inventes reglas de negocio.** Si no está en el plan, escribe un ADR en estado «Propuesto»
  y pregunta. Las 4 preguntas abiertas del §13 están en `docs/progreso.md`: ningún ADR que dependa
  de ellas pasa de «Propuesto».
- **No copies archivos de `referencias/legado/`**: reescribe la idea y cita el origen en la ficha.
- **Nada de nombres reales** en código, pruebas, docs ni mensajes de commit. `referencias/` está en
  `.gitignore` porque contiene datos reales de ~100 compañeros; el Excel real va en
  `referencias/privado/` y nunca se commitea. Para pruebas: fixtures sintéticos o
  `tests/fixtures/horario-anon.xlsx`.
- **Textos de UI: literales de los mockups.** Diferencias permitidas: plan §7.8. Cualquier otra
  lleva ADR.
- **Toda decisión documentada:** ADR (`docs/adr/`) + ficha (`docs/features/`) + `CHANGELOG.md`.
- **$0.** Si una pieza no cabe en una capa gratuita, se discute en un ADR antes de usarla.
- **Tiempo:** fechas `YYYY-MM-DD` locales + minutos desde medianoche, zona `America/El_Salvador`.
  Un turno que termina `00:00` termina ese mismo día y **no** lleva «+1» (ADR-0008).
- Identificadores de código en inglés. Textos de UI y documentación en español.
- Cada archivo de `src/domain/` y `src/features/` empieza con un comentario de 2–3 líneas: qué hace
  y qué ficha de `docs/` lo describe.

## Definición de terminado

Cada tarea y cada PR la cumple completa (plan §9.3):

- [ ] `npm run check` pasa (tipos, lint, pruebas).
- [ ] Hay pruebas para la lógica nueva de `src/domain` (casos normales y bordes).
- [ ] La ficha de la feature (`docs/features/…`) refleja cómo funciona **ahora**: archivos, datos,
      reglas, errores, pruebas.
- [ ] Si hubo una decisión, tiene su ADR y está enlazado desde la ficha.
- [ ] Si cambió la base, hay migración nueva y `modelo-de-datos.md` actualizado.
- [ ] Si cambió una variable de entorno o un paso de despliegue, el runbook está actualizado.
- [ ] `CHANGELOG.md` tiene la entrada en «Sin publicar».
- [ ] `docs/progreso.md` tiene el estado y el siguiente paso.
- [ ] `npm run docs:check` pasa: todo `.md` de `docs/` está enlazado en `00-indice.md`; cada carpeta
      de `src/features/` tiene su ficha; cada archivo de `src/domain` y `src/features` tiene su
      comentario de cabecera.
- [ ] Ningún nombre real en el diff.

## Commits y PRs

- Conventional Commits (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`) con descripción breve
  en español, enfocada en el *por qué*.
- **No agregues líneas `Co-Authored-By` ni `Claude-Session` a los commits.**
- Un PR por tarea; la plantilla del PR trae la Definición de terminado.
- No hagas `commit` ni `push` salvo petición explícita.

## Modelo sugerido por fase (plan §0.5)

- **Opus** — fases 0, 1, 2, 6 y la revisión de la 8: decisiones, parser, reglas y seguridad.
- **Sonnet** — fases 3, 4, 5 y 7: pantallas que siguen las capturas.
