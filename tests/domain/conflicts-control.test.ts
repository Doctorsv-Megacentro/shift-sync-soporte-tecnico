/**
 * Casos de control del plan §7.3 sobre el fixture anonimizado.
 * Ficha: docs/features/panel.md.
 */

import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import * as XLSX from 'xlsx';
import { hojasDeLibro } from '../../src/data/excel.ts';
import { parseWorkbook } from '../../src/domain/workbook.ts';
import { verificarCasosDeControl } from './casos-control-panel.ts';

describe('casos de control del panel (fixture anonimizado, plan §7.3)', () => {
  it('cuadra huecos, descansos, formato, diff y las métricas del 2 de noviembre', () => {
    const libro = parseWorkbook(hojasDeLibro(XLSX.read(readFileSync('tests/fixtures/horario-anon.xlsx'), { cellDates: false })));
    verificarCasosDeControl(libro);
  });
});
