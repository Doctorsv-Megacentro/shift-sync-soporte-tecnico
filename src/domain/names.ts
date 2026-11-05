/**
 * Clave estable de una persona y su nombre a mostrar. Es lo que permite
 * reconocer a la misma persona entre meses aunque su nombre venga escrito de
 * otra forma. Documentado en docs/features/carga-horario.md (plan §5.5).
 */

import { NOMBRES_COMUNES, PARTICULAS } from './config.ts';
import { capitalizar, normalize } from './text.ts';
import { toDateKey } from './time.ts';
import type { DateKey } from './types.ts';

/** Sufijo `(3/11)` al final del nombre: es la fecha de ingreso. */
const RE_SUFIJO_FECHA = /\s*\(\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\)\s*$/;

export interface NombreInterpretado {
  /** Clave estable: tokens normalizados y **ordenados alfabéticamente**. */
  readonly key: string;
  /** Nombre a mostrar, siempre «nombres + apellidos». */
  readonly displayName: string;
  /** Fecha de ingreso, si el nombre traía el sufijo `(d/m)`. */
  readonly joinedOn: DateKey | null;
  /** El orden nombre/apellido es dudoso: jefatura debería confirmarlo. */
  readonly needsReview: boolean;
  /** Venía como `APELLIDOS, NOMBRES`. Genera aviso informativo. */
  readonly hadComma: boolean;
  /** Traía el sufijo `(d/m)`. Genera aviso informativo. */
  readonly hadDateSuffix: boolean;
}

/** ¿Está todo en mayúsculas? Si trae minúsculas, se asume nombre-apellido. */
function esTodoMayusculas(texto: string): boolean {
  return texto === texto.toLocaleUpperCase('es');
}

function esParticula(token: string): boolean {
  return PARTICULAS.includes(normalize(token));
}

/**
 * Agrupa las partículas con la palabra que les sigue, de modo que `DE MOLINA`
 * cuente como un solo apellido y `DE LA CRUZ` también.
 */
function agrupar(tokens: readonly string[]): string[][] {
  const grupos: string[][] = [];
  let actual: string[] = [];
  for (const token of tokens) {
    actual.push(token);
    if (!esParticula(token)) {
      grupos.push(actual);
      actual = [];
    }
  }
  // Si el nombre acaba en partícula (raro, pero la hoja manda), no se pierde.
  if (actual.length > 0) grupos.push(actual);
  return grupos;
}

/**
 * Reparte los grupos entre apellidos y nombres, con las proporciones del
 * plan §5.5: 2 grupos → 1 apellido + 1 nombre; 3 → 1 + 2; 4 → 2 + 2;
 * 5 o más → 2 apellidos y el resto nombres.
 *
 * Con un refinamiento sobre el plan (ADR-0013, **Propuesto**): un grupo que
 * empieza por partícula es siempre un apellido, así que no puede ser el primer
 * nombre. Sin esto, `FUENTES DE LEON NURIA` son 3 grupos, el reparto por conteo
 * da 1 apellido + 2 nombres y sale «De Leon Nuria Fuentes» en lugar de
 * «Nuria Fuentes de Leon».
 */
function repartir(grupos: readonly string[][]): { apellidos: string[][]; nombres: string[][] } {
  const n = grupos.length;
  let cuantosApellidos = n <= 1 ? 0 : n <= 3 ? 1 : 2;

  while (cuantosApellidos < n && esParticula(grupos[cuantosApellidos]?.[0] ?? '')) {
    cuantosApellidos++;
  }

  return {
    apellidos: grupos.slice(0, cuantosApellidos),
    nombres: grupos.slice(cuantosApellidos),
  };
}

/** Aplica la capitalización de título a una lista de tokens ya ordenada. */
function formatear(tokens: readonly string[]): string {
  return tokens.map((t, i) => capitalizar(t, PARTICULAS, i === 0)).join(' ');
}

/**
 * Interpreta el nombre tal como viene en la columna B.
 *
 * `anio` es el año de la pestaña: el sufijo `(3/11)` solo trae día y mes, así
 * que el año se toma del mes que se está leyendo.
 */
export function parsePersonName(rawName: string, anio: number): NombreInterpretado {
  const original = String(rawName).replace(/\s+/g, ' ').trim();

  // 1. El sufijo (d/m) es la fecha de ingreso, no parte del nombre.
  const conFecha = RE_SUFIJO_FECHA.exec(original);
  const sinSufijo = conFecha ? original.replace(RE_SUFIJO_FECHA, '').trim() : original;
  const joinedOn = conFecha
    ? toDateKey(anio, Number(conFecha[2]), Number(conFecha[1]))
    : null;

  // 2. La clave no distingue el orden: se ordenan los tokens alfabéticamente.
  const key = normalize(sinSufijo.replace(/,/g, ' '))
    .split(' ')
    .filter((t) => t !== '')
    .sort()
    .join(' ');

  const hadComma = sinSufijo.includes(',');
  const resultado = { key, joinedOn, hadComma, hadDateSuffix: conFecha !== null };

  // 3. `APELLIDOS, NOMBRES` dice el orden de forma explícita: se invierte.
  if (hadComma) {
    const [apellidos = '', nombres = ''] = sinSufijo.split(',');
    const tokens = [...trocear(nombres), ...trocear(apellidos)];
    return { ...resultado, displayName: formatear(tokens), needsReview: false };
  }

  const tokens = trocear(sinSufijo);
  if (tokens.length === 0) return { ...resultado, displayName: '', needsReview: false };

  // 4. Con minúsculas de por medio, se asume que ya está en nombre-apellido.
  if (!esTodoMayusculas(sinSufijo)) {
    return { ...resultado, displayName: formatear(tokens), needsReview: false };
  }

  const grupos = agrupar(tokens);

  // 5. Todo en mayúsculas pero empieza por un nombre de pila conocido y no
  //    acaba en uno: probablemente ya viene en orden nombre-apellido. No se
  //    invierte a ciegas; se deja y se marca para que jefatura lo confirme.
  const primero = normalize(grupos[0]?.join(' ') ?? '');
  const ultimo = normalize(grupos[grupos.length - 1]?.join(' ') ?? '');
  if (grupos.length >= 2 && NOMBRES_COMUNES.has(primero) && !NOMBRES_COMUNES.has(ultimo)) {
    return { ...resultado, displayName: formatear(tokens), needsReview: true };
  }

  // 6. El caso normal de la hoja: APELLIDOS NOMBRES → nombres + apellidos.
  const { apellidos, nombres } = repartir(grupos);
  const ordenados = [...nombres.flat(), ...apellidos.flat()];
  return { ...resultado, displayName: formatear(ordenados), needsReview: false };
}

/**
 * Las dos lecturas de un nombre cuyo orden es dudoso (`needsReview`): tal
 * como viene («Nombre primero») y con el reparto apellido-nombre del plan
 * («Apellido primero»). `null` si el orden no está en duda.
 */
export function alternativasDeNombre(
  rawName: string,
  anio: number,
): { readonly nombrePrimero: string; readonly apellidoPrimero: string } | null {
  const interpretado = parsePersonName(rawName, anio);
  if (!interpretado.needsReview) return null;

  const sinSufijo = rawName.replace(/\s+/g, ' ').trim().replace(RE_SUFIJO_FECHA, '').trim();
  const { apellidos, nombres } = repartir(agrupar(trocear(sinSufijo)));
  return {
    nombrePrimero: interpretado.displayName,
    apellidoPrimero: formatear([...nombres.flat(), ...apellidos.flat()]),
  };
}

function trocear(texto: string): string[] {
  return texto
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t !== '');
}
