/**
 * Normalización de texto, compartida por el catálogo, los nombres y la lectura
 * de celdas. Equivale al `normalize` de `utils.ts` de v1 (ADR-0001).
 */

/** Marcas diacríticas combinadas, lo que deja `normalize('NFD')` al separar. */
const DIACRITICOS = /[̀-ͯ]/g;

/**
 * Quita tildes y diacríticos, pasa a mayúsculas y colapsa los espacios.
 * Es la forma en la que se comparan departamentos, valores de celda y nombres.
 */
export function normalize(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Como `normalize`, pero en minúsculas. Sirve para buscar sin que importen las
 * tildes ni las mayúsculas: «jose» encuentra «José».
 */
export function fold(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .normalize('NFD')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** ¿`texto` contiene `aguja`, ignorando tildes y mayúsculas? */
export function contieneTexto(texto: unknown, aguja: string): boolean {
  const a = fold(aguja);
  if (a === '') return false;
  return fold(texto).includes(a);
}

/**
 * Capitaliza una palabra como título, dejando las partículas en minúscula salvo
 * al inicio. **No añade ni quita tildes**: conserva las del original
 * (plan §5.5, punto 5).
 */
export function capitalizar(
  palabra: string,
  particulas: readonly string[],
  esInicio: boolean,
): string {
  if (palabra === '') return '';
  const esParticula = particulas.includes(normalize(palabra));
  if (esParticula && !esInicio) return palabra.toLocaleLowerCase('es');
  return palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1).toLocaleLowerCase('es');
}

/** Ordena por nombre a mostrar, con las reglas del español. */
export function compararNombres(a: string, b: string): number {
  return a.localeCompare(b, 'es');
}
