/**
 * Construye libros `.xlsx` sintéticos con SheetJS para las pruebas. Se generan
 * de verdad y se vuelven a leer por el mismo camino que usa la aplicación, así
 * que las pruebas ejercitan también los seriales de fecha de Excel.
 *
 * **Todos los nombres son ficticios** (ADR-0011).
 */

import * as XLSX from 'xlsx';
import { hojasDeLibro } from '../../src/data/excel.ts';
import type { HojaCruda } from '../../src/domain/workbook.ts';

/** Una pestaña a construir. */
export interface HojaSintetica {
  readonly nombre: string;
  readonly oculta?: boolean;
  /** Filas tal cual: la 0 es el nombre del día, la 1 las fechas, la 2+ gente. */
  readonly filas: readonly (readonly unknown[])[];
}

/** Días entre el epoch de Unix y el ancla de los seriales de Excel. */
const SERIAL_EPOCH_UNIX = 25569;
const MS_POR_DIA = 86_400_000;

/** `YYYY-MM-DD` → serial de Excel, que es como la hoja real guarda las fechas. */
export function serial(fecha: string): number {
  return new Date(`${fecha}T00:00:00Z`).getTime() / MS_POR_DIA + SERIAL_EPOCH_UNIX;
}

/** Los seriales de un rango de días consecutivos. */
export function serialesDelMes(anio: number, mes: number, dias: number): number[] {
  return Array.from({ length: dias }, (_, i) =>
    serial(`${anio}-${String(mes).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  );
}

/**
 * Construye el libro, lo serializa a `.xlsx` y lo vuelve a leer con el mismo
 * código que la aplicación. Devuelve lo que el dominio recibiría.
 */
export function construirLibro(hojas: readonly HojaSintetica[]): HojaCruda[] {
  const wb = XLSX.utils.book_new();

  for (const hoja of hojas) {
    const ws = XLSX.utils.aoa_to_sheet(hoja.filas as unknown[][]);
    XLSX.utils.book_append_sheet(wb, ws, hoja.nombre);
  }

  // SheetJS guarda el estado de visibilidad en Workbook.Sheets, en el mismo
  // orden que SheetNames.
  wb.Workbook ??= {};
  wb.Workbook.Sheets = hojas.map((h) => ({
    name: h.nombre,
    ...(h.oculta === true ? { Hidden: 1 as const } : {}),
  }));

  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return hojasDeLibro(XLSX.read(bytes, { type: 'array', cellDates: false }));
}

/**
 * Un mes mínimo y correcto, para las pruebas que solo necesitan algo que
 * funcione. Noviembre de 2026, 3 días, 2 personas.
 */
export function mesSencillo(nombre = 'Noviembre'): HojaSintetica {
  return {
    nombre,
    filas: [
      ['', '', 'domingo', 'lunes', 'martes'],
      ['', '', serial('2026-11-01'), serial('2026-11-02'), serial('2026-11-03')],
      ['MEGA N1', 'MARTINEZ ROSALES ANA LUCIA', '06:00-15:00', '06:00-15:00', 'Libre'],
      ['SUP MEGA', 'CRUZ DE MOLINA SOFIA ELENA', 'Libre', '14:00-23:00', '14:00-23:00'],
    ],
  };
}
