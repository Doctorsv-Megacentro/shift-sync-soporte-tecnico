/**
 * Lee los bytes de un `.xlsx` con SheetJS y los entrega al dominio como filas
 * crudas. Aquí vive la dependencia de SheetJS: `src/domain/` no la conoce, para
 * que la lógica siga siendo TypeScript puro y comprobable (plan §2.4).
 */

import * as XLSX from 'xlsx';
import type { HojaCruda } from '../domain/workbook.ts';

/** Tope de tamaño, el mismo que aplica `/api/hoja` (ADR-0005). */
export const MAX_BYTES = 10 * 1024 * 1024;

export class ExcelDemasiadoGrande extends Error {
  constructor(bytes: number) {
    super(
      `El archivo pesa ${(bytes / 1024 / 1024).toFixed(1)} MB y el máximo es ${MAX_BYTES / 1024 / 1024} MB.`,
    );
    this.name = 'ExcelDemasiadoGrande';
  }
}

export class ExcelIlegible extends Error {
  constructor(causa: unknown) {
    super('No se pudo abrir el archivo. Comprueba que sea un .xlsx y que no esté dañado.');
    this.name = 'ExcelIlegible';
    this.cause = causa;
  }
}

/**
 * Convierte un libro de SheetJS en las filas que espera el dominio.
 *
 * Se lee con `raw: true` y **sin** `cellDates`, así que las fechas llegan como
 * seriales de Excel. Es determinista y no arrastra la zona horaria del
 * navegador, que es justo lo que el ADR-0008 quiere evitar.
 */
export function hojasDeLibro(wb: XLSX.WorkBook): HojaCruda[] {
  const ocultas = new Map(
    (wb.Workbook?.Sheets ?? []).map((s) => [s.name, (s.Hidden ?? 0) !== 0]),
  );

  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows: unknown[][] =
      ws === undefined
        ? []
        : XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: true, defval: null });
    return {
      sheetName,
      hidden: ocultas.get(sheetName) ?? false,
      rows,
    };
  });
}

/** Lee los bytes de un `.xlsx`. Lanza `ExcelDemasiadoGrande` o `ExcelIlegible`. */
export function leerLibroExcel(bytes: ArrayBuffer | Uint8Array): HojaCruda[] {
  const tamano = bytes instanceof Uint8Array ? bytes.byteLength : bytes.byteLength;
  if (tamano > MAX_BYTES) throw new ExcelDemasiadoGrande(tamano);

  try {
    const wb = XLSX.read(bytes, { type: 'array', cellDates: false });
    return hojasDeLibro(wb);
  } catch (causa) {
    throw new ExcelIlegible(causa);
  }
}

/** Lee el `.xlsx` que el usuario eligió o arrastró en la pantalla de Fuente. */
export async function leerArchivoExcel(file: File): Promise<HojaCruda[]> {
  if (file.size > MAX_BYTES) throw new ExcelDemasiadoGrande(file.size);
  return leerLibroExcel(await file.arrayBuffer());
}
