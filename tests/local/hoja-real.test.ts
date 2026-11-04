/**
 * Verifica los criterios de aceptación del plan §6.5 contra el Excel real de
 * la operación. **Se salta sola** si no existe `referencias/privado/`: no
 * rompe el CI ni bloquea a quien clona el repo sin el archivo real.
 *
 * Documentado en docs/progreso.md («El contrato de la hoja, verificado contra
 * el archivo real») y en docs/datos/formato-hoja.md.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hojasDeLibro } from '../../src/data/excel.ts';
import { SEDES } from '../../src/domain/catalog.ts';
import { endsNextDay, parseShift, shiftDuration } from '../../src/domain/shift.ts';
import { validateMonth } from '../../src/domain/validate.ts';
import { parseWorkbook, resumirMes } from '../../src/domain/workbook.ts';
import * as XLSX from 'xlsx';

const DIR_PRIVADO = 'referencias/privado';

function archivoReal(): string | null {
  if (!existsSync(DIR_PRIVADO)) return null;
  const candidato = readdirSync(DIR_PRIVADO).find(
    (f) => f.toLowerCase().endsWith('.xlsx') && !f.startsWith('~$'),
  );
  return candidato ? join(DIR_PRIVADO, candidato) : null;
}

const ruta = archivoReal();

// `describe.skipIf` deja constancia en la salida de que se saltó, en lugar de
// que la suite desaparezca sin dejar rastro.
describe.skipIf(ruta === null)('el Excel real de la operación (plan §6.5)', () => {
  if (ruta === null) return;

  const wb = XLSX.read(readFileSync(ruta), { cellDates: false });
  const libro = parseWorkbook(hojasDeLibro(wb));
  const mesPorNombre = new Map(libro.months.map((m) => [m.sheetName, m]));

  it('carga las tres pestañas sin saltarse ninguna', () => {
    expect(libro.months.map((m) => m.sheetName)).toEqual(['Septiembre', 'Octubre', 'Noviembre']);
    expect(libro.skipped).toEqual([]);
  });

  it('Septiembre aparece oculta', () => {
    expect(mesPorNombre.get('Septiembre')?.hidden).toBe(true);
    expect(mesPorNombre.get('Octubre')?.hidden).toBe(false);
    expect(mesPorNombre.get('Noviembre')?.hidden).toBe(false);
  });

  // El criterio exacto del plan §6.5 para noviembre.
  it('Noviembre da 103 personas, 26 departamentos, 7 sedes + Sin sede y días 1–30', () => {
    const noviembre = mesPorNombre.get('Noviembre');
    expect(noviembre).toBeDefined();
    const resumen = resumirMes(noviembre!);

    expect(resumen.personas).toBe(103);
    expect(resumen.departamentos).toBe(26);
    expect(resumen.sedes).toBe(8); // las 7 del catálogo + Sin sede
    expect(resumen.dias).toBe(30);
    expect(noviembre?.dates[0]).toBe('2026-11-01');
    expect(noviembre?.dates.at(-1)).toBe('2026-11-30');

    const sedesEncontradas = new Set(noviembre?.people.map((p) => p.site));
    for (const sede of SEDES) expect(sedesEncontradas.has(sede), sede).toBe(true);
  });

  it('Octubre tiene 98 personas y 31 días', () => {
    const resumen = resumirMes(mesPorNombre.get('Octubre')!);
    expect(resumen.personas).toBe(98);
    expect(resumen.dias).toBe(31);
  });

  // El caso real que justifica «la fila 2 manda»: Septiembre empieza en la
  // columna D y acaba con una columna de fórmula que no es un día.
  it('Septiembre se lee bien aunque sus fechas empiecen en la columna D', () => {
    const septiembre = mesPorNombre.get('Septiembre');
    expect(septiembre?.dates[0]).toBe('2026-09-01');
    expect(septiembre?.dates.at(-1)).toBe('2026-09-30');
    expect(septiembre?.dates).toHaveLength(30);

    const avisoColumna = libro.warnings.find(
      (w) => w.code === 'columna-ignorada' && w.sheetName === 'Septiembre',
    );
    expect(avisoColumna?.message).toMatch(/Libres por periodo/);
  });

  it('ningún departamento de la hoja real queda desconocido', () => {
    const avisos = libro.months.flatMap((m) => validateMonth(m));
    const desconocidos = avisos.filter((w) => w.code === 'departamento-desconocido');
    expect(desconocidos).toEqual([]);
  });

  // Confirmado al inspeccionar el archivo (docs/progreso.md): no hay celdas
  // vacías ni valores no reconocidos en ninguna de las tres pestañas.
  it('no hay celdas vacías ni valores no reconocidos', () => {
    for (const mes of libro.months) {
      const sinDato = mes.entries.filter((e) => e.shift.kind === 'unknown');
      expect(sinDato, mes.sheetName).toEqual([]);
    }
  });

  // VACACIONES y Vacaciones conviven en Noviembre y deben dar el mismo kind.
  it('VACACIONES y Vacaciones dan el mismo resultado en toda la hoja', () => {
    for (const mes of libro.months) {
      const variantes = new Set(
        mes.entries.filter((e) => e.shift.kind === 'vacation').map((e) => e.shift.raw),
      );
      for (const raw of variantes) {
        expect(parseShift(raw).kind, `${mes.sheetName}: "${raw}"`).toBe('vacation');
      }
    }
  });

  it('noviembre trae 972 libres, 73 Vacaciones y 15 VACACIONES', () => {
    const noviembre = mesPorNombre.get('Noviembre');
    const libres = noviembre!.entries.filter((e) => e.shift.kind === 'off').length;
    const vacacionesMin = noviembre!.entries.filter((e) => e.shift.raw === 'Vacaciones').length;
    const vacacionesMay = noviembre!.entries.filter((e) => e.shift.raw === 'VACACIONES').length;

    expect(libres).toBe(972);
    expect(vacacionesMin).toBe(73);
    expect(vacacionesMay).toBe(15);
  });

  // ADR-0008, verificado sobre cada turno real de la hoja, no solo sobre un
  // ejemplo construido a mano.
  it('ningún turno real que acaba en 00:00 lleva «+1»', () => {
    let encontrados = 0;
    for (const mes of libro.months) {
      for (const { shift } of mes.entries) {
        if (shift.kind !== 'work' || !shift.raw.endsWith('00:00')) continue;
        encontrados++;
        expect(shift.endMin, shift.raw).toBe(1440);
        expect(endsNextDay(shift), shift.raw).toBe(false);
      }
    }
    expect(encontrados).toBeGreaterThan(0);
  });

  it('un turno que cruza medianoche sí dura lo que corresponde', () => {
    let encontrados = 0;
    for (const mes of libro.months) {
      for (const { shift } of mes.entries) {
        if (shift.kind !== 'work') continue;
        const [, h2] = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(shift.raw) ?? [];
        if (h2 === undefined) continue;
        if (!endsNextDay(shift)) continue;
        encontrados++;
        expect(shiftDuration(shift)).toBeGreaterThan(0);
        expect(shiftDuration(shift)).toBeLessThanOrEqual(24 * 60);
      }
    }
    expect(encontrados).toBeGreaterThan(0);
  });

  // Criterio de rendimiento del plan §6.5: menos de 2 s en un portátil normal.
  it('parsear el libro real tarda menos de 2 s', () => {
    const bytes = readFileSync(ruta!);
    const inicio = performance.now();
    const libroDeNuevo = XLSX.read(bytes, { cellDates: false });
    parseWorkbook(hojasDeLibro(libroDeNuevo));
    const duracion = performance.now() - inicio;

    expect(duracion).toBeLessThan(2000);
  });
});
