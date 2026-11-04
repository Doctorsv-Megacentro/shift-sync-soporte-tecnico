/**
 * Avisos de importación: lo que jefatura debe mirar **antes** de publicar.
 * Cada aviso lleva el código de la regla de conflicto equivalente, para poder
 * enlazarlos (docs/datos/reglas-conflictos.md).
 */

import { esDepartamentoMalEscrito, formaCorrecta } from './catalog.ts';
import { normalize } from './text.ts';
import { formatFechaCorta } from './time.ts';
import type { ParsedMonth, Warning } from './types.ts';

/**
 * Revisa un mes ya leído y devuelve sus avisos. Es una función pura: no toca
 * nada y se puede volver a ejecutar siempre que los datos cambien.
 *
 * Los avisos de estructura (pestaña ignorada, columna que no es día, persona
 * duplicada) los genera `workbook.ts` al leer, porque solo ahí se conoce la
 * forma de la hoja.
 */
export function validateMonth(mes: ParsedMonth): Warning[] {
  const warnings: Warning[] = [];

  // --- Celdas que no se reconocen -----------------------------------------
  // Se agrupan por persona: 30 celdas malas de la misma fila son un problema,
  // no treinta. Así la lista de avisos sigue siendo legible.
  const sinDatoPorPersona = new Map<string, string[]>();
  for (const entry of mes.entries) {
    if (entry.shift.kind !== 'unknown') continue;
    const fechas = sinDatoPorPersona.get(entry.personKey) ?? [];
    fechas.push(entry.date);
    sinDatoPorPersona.set(entry.personKey, fechas);
  }

  for (const [personKey, fechas] of sinDatoPorPersona) {
    const persona = mes.people.find((p) => p.key === personKey);
    const nombre = persona?.displayName ?? personKey;
    const primera = fechas[0];
    const detalle =
      fechas.length === 1 && primera !== undefined
        ? `el ${formatFechaCorta(primera)}`
        : `${fechas.length} días`;
    warnings.push({
      code: 'valor-no-reconocido',
      severity: 'media',
      message: `«${nombre}» tiene ${detalle} sin un valor que se entienda. Revísalo con coordinación.`,
      sheetName: mes.sheetName,
      personKey,
      ...(fechas.length === 1 && primera !== undefined ? { date: primera } : {}),
    });
  }

  // --- Departamentos ------------------------------------------------------
  const departamentos = new Set(mes.people.map((p) => p.department));
  for (const departamento of departamentos) {
    if (departamento === '') continue;

    if (esDepartamentoMalEscrito(departamento)) {
      warnings.push({
        code: 'departamento-mal-escrito',
        severity: 'baja',
        message: `El departamento «${departamento}» está mal escrito en la hoja. Debería ser «${formaCorrecta(departamento) ?? ''}».`,
        sheetName: mes.sheetName,
      });
      continue;
    }

    const alguna = mes.people.find((p) => p.department === departamento);
    if (alguna && alguna.role === 'Otro' && alguna.site === 'Sin sede') {
      warnings.push({
        code: 'departamento-desconocido',
        severity: 'media',
        message: `El departamento «${departamento}» no está en el catálogo: su gente queda sin sede ni rol. Añádelo al catálogo.`,
        sheetName: mes.sheetName,
      });
    }
  }

  // --- Formato de los nombres --------------------------------------------
  const conFecha = mes.people.filter((p) => p.joinedOn !== null);
  if (conFecha.length > 0) {
    warnings.push({
      code: 'fecha-en-nombre',
      severity: 'baja',
      message:
        conFecha.length === 1
          ? `«${conFecha[0]?.displayName ?? ''}» trae su fecha de ingreso en el nombre. Se interpreta como un ingreso nuevo.`
          : `${conFecha.length} personas traen su fecha de ingreso en el nombre. Se interpretan como ingresos nuevos.`,
      sheetName: mes.sheetName,
    });
  }

  const conComa = mes.people.filter((p) => p.rawName.includes(','));
  if (conComa.length > 0) {
    warnings.push({
      code: 'nombre-con-coma',
      severity: 'baja',
      message: `${conComa.length === 1 ? 'Un nombre viene' : `${conComa.length} nombres vienen`} como «APELLIDOS, NOMBRES». Se invierte al mostrarlo.`,
      sheetName: mes.sheetName,
    });
  }

  const dudosos = mes.people.filter((p) => p.needsReview);
  if (dudosos.length > 0) {
    warnings.push({
      code: 'orden-nombre-dudoso',
      severity: 'baja',
      message: `Revisa el orden de ${dudosos.length} ${dudosos.length === 1 ? 'nombre' : 'nombres'}: no está claro qué es nombre y qué apellido.`,
      sheetName: mes.sheetName,
    });
  }

  // --- Variantes de «Vacaciones» -----------------------------------------
  const variantes = new Set<string>();
  for (const entry of mes.entries) {
    if (entry.shift.kind === 'vacation') variantes.add(entry.shift.raw);
  }
  if (variantes.size > 1) {
    const mayusculas = [...variantes].filter((v) => v === normalize(v) && v !== '');
    if (mayusculas.length > 0) {
      warnings.push({
        code: 'vacaciones-mayusculas',
        severity: 'baja',
        message: `«Vacaciones» viene escrito de ${variantes.size} formas distintas en la hoja. Se interpretan todas igual.`,
        sheetName: mes.sheetName,
      });
    }
  }

  return warnings;
}

/** Cuenta los avisos por severidad, que es lo que se muestra en el resumen. */
export function contarPorSeveridad(warnings: readonly Warning[]): {
  alta: number;
  media: number;
  baja: number;
} {
  const salida = { alta: 0, media: 0, baja: 0 };
  for (const w of warnings) salida[w.severity]++;
  return salida;
}
