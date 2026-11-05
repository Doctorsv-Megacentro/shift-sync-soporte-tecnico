/**
 * Los mismos casos de control, sobre el Excel real si está en la máquina.
 * Fuera de `npm run check`: `npm run test:local`. Ficha: docs/features/panel.md.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'vitest';
import * as XLSX from 'xlsx';
import { hojasDeLibro } from '../../src/data/excel.ts';
import { parseWorkbook } from '../../src/domain/workbook.ts';
import { verificarCasosDeControl } from '../domain/casos-control-panel.ts';

const CARPETA = 'referencias/privado';

function excelReal(): string | null {
  if (!existsSync(CARPETA)) return null;
  const archivo = readdirSync(CARPETA).find((nombre) => nombre.toLowerCase().endsWith('.xlsx'));
  return archivo === undefined ? null : join(CARPETA, archivo);
}

describe('casos de control sobre la hoja real', () => {
  const ruta = excelReal();

  it.skipIf(ruta === null)('cuadra las mismas cifras que el fixture anonimizado', () => {
    const libro = parseWorkbook(hojasDeLibro(XLSX.read(readFileSync(ruta!), { cellDates: false })));
    verificarCasosDeControl(libro);
  });
});
