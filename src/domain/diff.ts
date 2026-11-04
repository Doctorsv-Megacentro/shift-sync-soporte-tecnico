/**
 * Compara un mes con el anterior: quién entró, quién salió y quién cambió de
 * departamento. Es lo que jefatura revisa al recargar la hoja (plan §6.4).
 */

import { compararNombres } from './text.ts';
import type { MonthDiff, ParsedMonth } from './types.ts';

/**
 * Cambios de `actual` respecto a `anterior`, comparando **por clave estable**
 * de persona: así un nombre reescrito no se confunde con un ingreso y una
 * salida (plan §5.5).
 */
export function diffMonths(anterior: ParsedMonth, actual: ParsedMonth): MonthDiff {
  const antes = new Map(anterior.people.map((p) => [p.key, p]));
  const ahora = new Map(actual.people.map((p) => [p.key, p]));

  const joined = [...ahora.values()]
    .filter((p) => !antes.has(p.key))
    .map((p) => ({ personKey: p.key, displayName: p.displayName, joinedOn: p.joinedOn }))
    .sort((a, b) => compararNombres(a.displayName, b.displayName));

  const left = [...antes.values()]
    .filter((p) => !ahora.has(p.key))
    .map((p) => ({ personKey: p.key, displayName: p.displayName }))
    .sort((a, b) => compararNombres(a.displayName, b.displayName));

  const movedDepartment = [...ahora.values()]
    .flatMap((p) => {
      const previa = antes.get(p.key);
      if (previa === undefined || previa.department === p.department) return [];
      return [{
        personKey: p.key,
        displayName: p.displayName,
        fromDepartment: previa.department,
        toDepartment: p.department,
      }];
    })
    .sort((a, b) => compararNombres(a.displayName, b.displayName));

  return { from: anterior.month, to: actual.month, joined, left, movedDepartment };
}

/** ¿El diff no encontró nada? Sirve para no mostrar una sección vacía. */
export function sinCambios(diff: MonthDiff): boolean {
  return diff.joined.length === 0 && diff.left.length === 0 && diff.movedDepartment.length === 0;
}

/**
 * Una línea por tipo de cambio, en lenguaje de usuario, para el resumen de
 * lectura: «6 ingresos · 1 salida · 12 cambios de departamento».
 */
export function resumirDiff(diff: MonthDiff): string[] {
  const partes: string[] = [];
  if (diff.joined.length > 0) {
    partes.push(`${diff.joined.length} ${diff.joined.length === 1 ? 'ingreso' : 'ingresos'}`);
  }
  if (diff.left.length > 0) {
    partes.push(`${diff.left.length} ${diff.left.length === 1 ? 'salida' : 'salidas'}`);
  }
  if (diff.movedDepartment.length > 0) {
    const n = diff.movedDepartment.length;
    partes.push(`${n} ${n === 1 ? 'cambio' : 'cambios'} de departamento`);
  }
  return partes;
}

/**
 * Ordena los meses leídos por su fecha y los empareja consecutivamente, que es
 * cómo se compara un mes con el que de verdad lo precede.
 */
export function diffConsecutivos(months: readonly ParsedMonth[]): MonthDiff[] {
  const ordenados = [...months].sort((a, b) => a.month.localeCompare(b.month));
  const salida: MonthDiff[] = [];
  for (let i = 1; i < ordenados.length; i++) {
    const anterior = ordenados[i - 1];
    const actual = ordenados[i];
    if (anterior && actual) salida.push(diffMonths(anterior, actual));
  }
  return salida;
}
