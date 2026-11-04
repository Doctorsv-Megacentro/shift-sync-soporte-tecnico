/**
 * Convierte un libro de SheetJS en meses, personas y días. Es el
 * `parseWorkbookAll` de v1 reescrito (plan §6.1). El contrato de la hoja está
 * en docs/datos/formato-hoja.md.
 *
 * La regla que lo gobierna todo: **la fila 2 manda**. Una columna cuya fila 2
 * no es una fecha no es un día, y eso resuelve solo los casos raros de la hoja
 * (la columna de horas de Septiembre y su columna final `Libres por periodo`).
 */

import { resolveDepartment } from './catalog.ts';
import {
  COL_DEPARTAMENTO,
  COL_NOMBRE,
  FILA_FECHAS,
  PESTANAS_IGNORADAS,
  PREFIJO_PESTANA_IGNORADA,
  PRIMERA_FILA_PERSONA,
} from './config.ts';
import { parsePersonName } from './names.ts';
import { parseShift } from './shift.ts';
import { normalize } from './text.ts';
import { coerceDateKey, firstOfMonth, parseDateKey } from './time.ts';
import type {
  DateKey,
  ParsedMonth,
  ParsedWorkbook,
  ScheduleEntry,
  SheetPerson,
  SkippedSheet,
  Warning,
} from './types.ts';

/**
 * Lo mínimo que se necesita de SheetJS, declarado aquí para que el dominio no
 * dependa de la librería: quien llama pasa las filas ya extraídas.
 */
export interface HojaCruda {
  readonly sheetName: string;
  readonly hidden: boolean;
  /** Filas tal como las da `sheet_to_json(ws, { header: 1, raw: true })`. */
  readonly rows: readonly (readonly unknown[])[];
}

/** ¿Es una pestaña que nunca es un mes? */
export function esPestanaIgnorada(sheetName: string): boolean {
  const norm = normalize(sheetName);
  if (norm === '') return true;
  if (sheetName.startsWith(PREFIJO_PESTANA_IGNORADA)) return true;
  return PESTANAS_IGNORADAS.includes(norm);
}

/** Una columna de día: su índice y la fecha de su fila 2. */
interface ColumnaDia {
  readonly col: number;
  readonly date: DateKey;
}

/**
 * Empareja cada columna con **su** fecha de la fila 2. Las columnas cuya fila 2
 * no es una fecha se devuelven aparte, para poder avisar de ellas.
 */
function leerColumnasDeDia(rows: readonly (readonly unknown[])[]): {
  dias: ColumnaDia[];
  ignoradas: { col: number; valor: string }[];
} {
  const filaFechas = rows[FILA_FECHAS] ?? [];
  const dias: ColumnaDia[] = [];
  const ignoradas: { col: number; valor: string }[] = [];

  for (let col = COL_NOMBRE + 1; col < filaFechas.length; col++) {
    const valor = filaFechas[col];
    const date = coerceDateKey(valor);
    if (date !== null) {
      dias.push({ col, date });
    } else if (valor != null && String(valor).trim() !== '') {
      ignoradas.push({ col, valor: String(valor).trim() });
    }
  }

  return { dias, ignoradas };
}

/** Letra de columna de Excel, para que los avisos señalen un sitio concreto. */
export function letraColumna(col: number): string {
  let n = col;
  let salida = '';
  do {
    salida = String.fromCharCode(65 + (n % 26)) + salida;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return salida;
}

/** Lee una pestaña. Devuelve `null` si no tiene forma de mes. */
function leerMes(hoja: HojaCruda, warnings: Warning[]): ParsedMonth | { error: string } {
  const { dias, ignoradas } = leerColumnasDeDia(hoja.rows);

  if (dias.length === 0) {
    return { error: 'La fila 2 no tiene ninguna fecha, así que la pestaña no es un mes.' };
  }

  // Columnas que no son un día: la de horas de Septiembre, su `Libres por
  // periodo` final, o cualquier añadido de coordinación. Se avisa y se sigue.
  for (const { col, valor } of ignoradas) {
    warnings.push({
      code: 'columna-ignorada',
      severity: 'baja',
      message: `Columna ${letraColumna(col)} ignorada: «${valor}» no es una fecha.`,
      sheetName: hoja.sheetName,
    });
  }

  // El mes es el del primer día. El año sirve para el sufijo (d/m) del nombre.
  const primerDia = dias[0]?.date;
  if (primerDia === undefined) {
    return { error: 'La pestaña no tiene días legibles.' };
  }
  const month = firstOfMonth(primerDia);
  const anio = parseDateKey(primerDia).year;

  const people: SheetPerson[] = [];
  const entries: ScheduleEntry[] = [];
  const vistas = new Map<string, number>();

  for (let fila = PRIMERA_FILA_PERSONA; fila < hoja.rows.length; fila++) {
    const row = hoja.rows[fila] ?? [];
    const rawName = row[COL_NOMBRE];
    // Las filas sin nombre se ignoran sin avisar: son separadores y totales.
    if (rawName == null || String(rawName).trim() === '') continue;

    const department = String(row[COL_DEPARTAMENTO] ?? '').trim();
    const nombre = parsePersonName(String(rawName), anio);
    if (nombre.key === '') continue;

    const info = resolveDepartment(department);
    const numeroFila = fila + 1;

    const anterior = vistas.get(nombre.key);
    if (anterior !== undefined) {
      warnings.push({
        code: 'persona-duplicada',
        severity: 'media',
        message: `«${nombre.displayName}» aparece dos veces en ${hoja.sheetName} (filas ${anterior} y ${numeroFila}).`,
        sheetName: hoja.sheetName,
        personKey: nombre.key,
        row: numeroFila,
      });
    } else {
      vistas.set(nombre.key, numeroFila);
    }

    people.push({
      key: nombre.key,
      rawName: String(rawName).trim(),
      displayName: nombre.displayName,
      department,
      role: info.role,
      site: info.site,
      area: info.area,
      joinedOn: nombre.joinedOn,
      needsReview: nombre.needsReview,
      row: numeroFila,
    });

    for (const { col, date } of dias) {
      entries.push({
        personKey: nombre.key,
        date,
        department,
        shift: parseShift(row[col]),
      });
    }
  }

  return {
    sheetName: hoja.sheetName,
    hidden: hoja.hidden,
    month,
    dates: dias.map((d) => d.date),
    people,
    entries,
  };
}

/**
 * Lee el libro entero. Una pestaña que no encaja **no rompe la carga**: va a
 * `skipped` como aviso, igual que hacía v1.
 */
export function parseWorkbook(hojas: readonly HojaCruda[]): ParsedWorkbook {
  const months: ParsedMonth[] = [];
  const skipped: SkippedSheet[] = [];
  const warnings: Warning[] = [];

  for (const hoja of hojas) {
    if (esPestanaIgnorada(hoja.sheetName)) {
      skipped.push({ sheetName: hoja.sheetName, reason: 'Pestaña ignorada por su nombre.' });
      warnings.push({
        code: 'pestana-ignorada',
        severity: 'baja',
        message: `Pestaña «${hoja.sheetName}» ignorada: no es un mes.`,
        sheetName: hoja.sheetName,
      });
      continue;
    }

    const resultado = leerMes(hoja, warnings);
    if ('error' in resultado) {
      skipped.push({ sheetName: hoja.sheetName, reason: resultado.error });
      warnings.push({
        code: 'pestana-ignorada',
        severity: 'media',
        message: `Pestaña «${hoja.sheetName}» no se pudo leer. ${resultado.error}`,
        sheetName: hoja.sheetName,
      });
      continue;
    }

    months.push(resultado);
  }

  return { months, skipped, warnings };
}

// ---------------------------------------------------------------------------
// Consultas sobre lo leído
// ---------------------------------------------------------------------------

/** Índice `personKey → fecha → día`, para no recorrer el array en cada lectura. */
export function indexarEntradas(
  entries: readonly ScheduleEntry[],
): Map<string, Map<DateKey, ScheduleEntry>> {
  const indice = new Map<string, Map<DateKey, ScheduleEntry>>();
  for (const entry of entries) {
    let porFecha = indice.get(entry.personKey);
    if (porFecha === undefined) {
      porFecha = new Map();
      indice.set(entry.personKey, porFecha);
    }
    porFecha.set(entry.date, entry);
  }
  return indice;
}

/** Resumen de lectura de un mes, que es lo que se muestra antes de publicar. */
export interface ResumenMes {
  readonly sheetName: string;
  readonly month: DateKey;
  readonly personas: number;
  readonly departamentos: number;
  readonly sedes: number;
  readonly dias: number;
  readonly turnos: number;
  readonly libres: number;
  readonly vacaciones: number;
  readonly sinDato: number;
}

export function resumirMes(mes: ParsedMonth): ResumenMes {
  let turnos = 0;
  let libres = 0;
  let vacaciones = 0;
  let sinDato = 0;
  for (const { shift } of mes.entries) {
    if (shift.kind === 'work') turnos++;
    else if (shift.kind === 'off') libres++;
    else if (shift.kind === 'vacation') vacaciones++;
    else sinDato++;
  }

  return {
    sheetName: mes.sheetName,
    month: mes.month,
    personas: mes.people.length,
    departamentos: new Set(mes.people.map((p) => p.department)).size,
    sedes: new Set(mes.people.map((p) => p.site)).size,
    dias: mes.dates.length,
    turnos,
    libres,
    vacaciones,
    sinDato,
  };
}
