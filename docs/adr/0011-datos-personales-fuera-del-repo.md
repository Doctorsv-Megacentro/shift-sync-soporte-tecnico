# 0011 — Datos personales fuera del repo

- Estado: Aceptado
- Fecha: 2026-11-02
- Relacionado: [ADR-0001](0001-repo-nuevo.md), [ADR-0006](0006-acceso-de-empleados-y-jefatura.md), plan §2.5

## Contexto

La hoja tiene nombres y horarios de ~100 compañeros. Las capturas del diseño aprobado y los mockups
`.dc.html` llevan esos datos incrustados, porque se hicieron sobre la hoja real. El repo de v1 es
público.

Al iniciar este repositorio, esas referencias estaban dentro de `docs/` y no había `.gitignore`: un
`git add .` las habría publicado.

## Decisión

**Ningún dato personal real entra al repositorio.** Ni en código, ni en pruebas, ni en
documentación, ni en mensajes de commit.

- `referencias/` está en `.gitignore` y contiene `diseno/` (capturas y mockups), `privado/` (el
  Excel real) y `legado/` (el clon de v1).
- Las pruebas usan **fixtures sintéticos** construidos con SheetJS, o `tests/fixtures/horario-anon.xlsx`,
  generado por `scripts/anonimizar-excel.ts` a partir del Excel real.
- El anonimizador sustituye nombres por ficticios **de forma consistente entre pestañas**,
  conservando el formato que importa para el parser (mayúsculas, coma, sufijo `(d/m)`) y el resto de
  la hoja intacto.
- Lo que sí puede entrar al repo (tokens, reglas, textos de la interfaz) se transcribe en `docs/`
  sin datos personales.
- Los correos de jefatura se cargan por SQL siguiendo el runbook; no van en el repo.

## Alternativas consideradas

- **Repo privado con los datos dentro** — reduce la exposición pero no la elimina: el historial de
  git es permanente y el acceso al repo cambia con el tiempo. Tampoco permitiría abrirlo después.

## Consecuencias

- Las pruebas que dependen del Excel real (`tests/local/`) **se saltan solas** si no existe
  `referencias/privado/`, y quedan fuera del CI.
- Quien clone el repo no tiene las capturas de referencia: hay que pasárselas aparte.
- La Definición de terminado incluye la casilla «ningún nombre real en el diff», que se revisa a
  mano en cada PR.

## Cómo verificarlo

`git status --porcelain --untracked-files=all` no muestra ninguna ruta bajo `referencias/`, y
`git check-ignore -v referencias/diseno/capturas/01-empleado-mi-dia.png` señala la regla que lo
impide. En cada PR, la casilla correspondiente de la plantilla.
