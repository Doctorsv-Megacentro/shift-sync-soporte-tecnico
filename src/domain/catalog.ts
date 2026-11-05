/**
 * Resuelve un departamento de la columna A a rol, sede y área. El catálogo vive
 * en código y en git a propósito (ADR-0009). Documentado en
 * docs/datos/catalogo-departamentos.md.
 */

import { ALIAS_DEPARTAMENTO, CATALOGO, REGLAS_ROL, REGLAS_SEDE } from './config.ts';
import { normalize } from './text.ts';
import type { DepartmentInfo, Role, Site } from './types.ts';

/** Lo que se devuelve cuando el departamento no se reconoce de ninguna forma. */
const DESCONOCIDO: DepartmentInfo = {
  role: 'Otro',
  site: 'Sin sede',
  area: null,
  match: 'unknown',
};

/**
 * Busca sede por fragmento. Se compara contra el departamento rodeado de
 * espacios para que `AT` no coincida dentro de `GESTION` ni `CC` dentro de
 * `SOPORTE`: los fragmentos son palabras, no subcadenas.
 */
function sedePorRegla(norm: string): Site | null {
  const acolchado = ` ${norm} `;
  for (const { fragmento, site } of REGLAS_SEDE) {
    // Los fragmentos con guion (`-SM`) se pegan a la palabra anterior.
    if (fragmento.startsWith('-')) {
      if (norm.endsWith(fragmento)) return site;
      continue;
    }
    if (acolchado.includes(` ${fragmento} `)) return site;
  }
  return null;
}

function rolPorRegla(norm: string): Role | null {
  const acolchado = ` ${norm} `;
  for (const { fragmento, role } of REGLAS_ROL) {
    if (acolchado.includes(` ${fragmento} `)) return role;
  }
  return null;
}

/**
 * Resuelve el departamento en tres pasos (plan §5.4):
 *
 * 1. coincidencia exacta normalizada contra la tabla del catálogo;
 * 2. alias de un departamento mal escrito en la hoja;
 * 3. reglas por fragmento (prefijo o sufijo).
 *
 * Si nada encaja, queda desconocido: `Sin sede`, rol `Otro`, y quien llama
 * genera el aviso correspondiente. Nunca lanza.
 */
export function resolveDepartment(department: unknown): DepartmentInfo {
  const norm = normalize(department);
  if (norm === '') return DESCONOCIDO;

  const exacto = CATALOGO.get(norm);
  if (exacto) {
    return { role: exacto.role, site: exacto.site, area: exacto.area, match: 'exact' };
  }

  // Mal escrito en la hoja original. Se acepta, pero se avisa.
  const corregido = ALIAS_DEPARTAMENTO.get(norm);
  if (corregido !== undefined) {
    const entrada = CATALOGO.get(corregido);
    if (entrada) {
      return { role: entrada.role, site: entrada.site, area: entrada.area, match: 'alias' };
    }
  }

  const site = sedePorRegla(norm);
  const role = rolPorRegla(norm);
  if (site !== null || role !== null) {
    return {
      role: role ?? 'Otro',
      site: site ?? 'Sin sede',
      area: null,
      match: 'rule',
    };
  }

  return DESCONOCIDO;
}

/** ¿Está escrito de una forma que el catálogo reconoce como errónea? */
export function esDepartamentoMalEscrito(department: unknown): boolean {
  return ALIAS_DEPARTAMENTO.has(normalize(department));
}

/** La forma correcta de un departamento mal escrito, para proponer el arreglo. */
export function formaCorrecta(department: unknown): string | null {
  return ALIAS_DEPARTAMENTO.get(normalize(department)) ?? null;
}

/** ¿El rol atiende tickets en una sede? Son los que exigen supervisión. */
export function esRolDeSoporteEnSede(role: Role): boolean {
  return role === 'N1' || role === 'N2';
}

/** Las sedes del catálogo, en el orden en el que se muestran. */
export const SEDES: readonly Site[] = [
  'Megacentro',
  'Tuscania',
  'Phoenix Tower',
  'Atento',
  'Santa Ana',
  'San Miguel',
  'Sin sede',
];

/** Los roles del catálogo, en el orden en el que se muestran. */
export const ROLES: readonly Role[] = [
  'N1',
  'N2',
  'Supervisor',
  'Coordinador',
  'Producto',
  'Tercería',
  'Redes',
  'Soporte de Salas',
  'QA',
  'Activo Fijo',
  'Otro',
];
