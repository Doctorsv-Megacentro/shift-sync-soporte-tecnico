import { describe, expect, it } from 'vitest';
import { diffConsecutivos, diffMonths, resumirDiff, sinCambios } from '../../src/domain/diff.ts';
import { parseWorkbook } from '../../src/domain/workbook.ts';
import { construirLibro, serial } from '../fixtures/construir.ts';
import type { ParsedMonth } from '../../src/domain/types.ts';

// Todos los nombres de estas pruebas son ficticios (ADR-0011).

/** Un mes de un solo día con la gente indicada como [departamento, nombre]. */
function mesCon(
  nombrePestana: string,
  fecha: string,
  gente: readonly (readonly [string, string])[],
): ParsedMonth {
  const libro = construirLibro([{
    nombre: nombrePestana,
    filas: [
      ['', '', 'dia'],
      ['', '', serial(fecha)],
      ...gente.map(([depto, nombre]) => [depto, nombre, '06:00-15:00']),
    ],
  }]);
  const leido = parseWorkbook(libro).months[0];
  if (leido === undefined) throw new Error('El fixture no produjo un mes');
  return leido;
}

const octubre = mesCon('Octubre', '2026-10-01', [
  ['MEGA N1', 'ROSALES ANA LUCIA'],
  ['CC N1', 'MOLINA SOFIA ELENA'],
  ['QA', 'RAMOS CARLOS'],
]);

describe('diffMonths', () => {
  it('detecta un ingreso', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', [
      ['MEGA N1', 'ROSALES ANA LUCIA'],
      ['CC N1', 'MOLINA SOFIA ELENA'],
      ['QA', 'RAMOS CARLOS'],
      ['MEGA N2', 'Pedro Alvarez (3/11)'],
    ]);
    const d = diffMonths(octubre, noviembre);

    expect(d.joined).toHaveLength(1);
    expect(d.joined[0]?.displayName).toBe('Pedro Alvarez');
    // El sufijo (d/m) se interpreta como la fecha de ingreso.
    expect(d.joined[0]?.joinedOn).toBe('2026-11-03');
    expect(d.left).toHaveLength(0);
  });

  it('detecta una salida', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', [
      ['MEGA N1', 'ROSALES ANA LUCIA'],
      ['CC N1', 'MOLINA SOFIA ELENA'],
    ]);
    const d = diffMonths(octubre, noviembre);

    expect(d.left).toHaveLength(1);
    expect(d.left[0]?.displayName).toBe('Carlos Ramos');
    expect(d.joined).toHaveLength(0);
  });

  it('detecta un cambio de departamento', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', [
      ['CC N2', 'ROSALES ANA LUCIA'],
      ['CC N1', 'MOLINA SOFIA ELENA'],
      ['QA', 'RAMOS CARLOS'],
    ]);
    const d = diffMonths(octubre, noviembre);

    expect(d.movedDepartment).toHaveLength(1);
    expect(d.movedDepartment[0]).toMatchObject({
      displayName: 'Ana Lucia Rosales',
      fromDepartment: 'MEGA N1',
      toDepartment: 'CC N2',
    });
  });

  // Lo que evita falsos ingresos y falsas salidas al recargar la hoja.
  it('un nombre reescrito no se confunde con un ingreso más una salida', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', [
      ['MEGA N1', 'Ana Lucía Rosales'],
      ['CC N1', 'MOLINA SOFIA ELENA'],
      ['QA', 'RAMOS CARLOS'],
    ]);
    const d = diffMonths(octubre, noviembre);

    expect(d.joined).toHaveLength(0);
    expect(d.left).toHaveLength(0);
    expect(d.movedDepartment).toHaveLength(0);
  });

  it('guarda de qué mes a qué mes compara', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', []);
    const d = diffMonths(octubre, noviembre);

    expect(d.from).toBe('2026-10-01');
    expect(d.to).toBe('2026-11-01');
  });

  it('ordena los resultados por nombre a mostrar', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', [
      ['MEGA N1', 'ROSALES ANA LUCIA'],
      ['CC N1', 'MOLINA SOFIA ELENA'],
      ['QA', 'RAMOS CARLOS'],
      ['MEGA N2', 'ZAMORA BEATRIZ'],
      ['MEGA N2', 'ALVAREZ PEDRO'],
    ]);
    const d = diffMonths(octubre, noviembre);

    expect(d.joined.map((p) => p.displayName)).toEqual(['Beatriz Zamora', 'Pedro Alvarez']);
  });
});

describe('sinCambios y resumirDiff', () => {
  it('sinCambios es cierto cuando nada se movió', () => {
    const d = diffMonths(octubre, mesCon('Noviembre', '2026-11-01', [
      ['MEGA N1', 'ROSALES ANA LUCIA'],
      ['CC N1', 'MOLINA SOFIA ELENA'],
      ['QA', 'RAMOS CARLOS'],
    ]));
    expect(sinCambios(d)).toBe(true);
    expect(resumirDiff(d)).toEqual([]);
  });

  it('resume en lenguaje de usuario, con singular y plural', () => {
    const d = diffMonths(octubre, mesCon('Noviembre', '2026-11-01', [
      ['CC N2', 'ROSALES ANA LUCIA'],
      ['MEGA N2', 'ALVAREZ PEDRO'],
      ['MEGA N2', 'ZAMORA BEATRIZ'],
    ]));

    expect(sinCambios(d)).toBe(false);
    expect(resumirDiff(d)).toEqual([
      '2 ingresos',
      '2 salidas',
      '1 cambio de departamento',
    ]);
  });
});

describe('diffConsecutivos', () => {
  it('empareja los meses en orden de calendario, no de pestaña', () => {
    const noviembre = mesCon('Noviembre', '2026-11-01', [['MEGA N1', 'ROSALES ANA LUCIA']]);
    const septiembre = mesCon('Septiembre', '2026-09-01', [['MEGA N1', 'ROSALES ANA LUCIA']]);

    // Se pasan desordenados a propósito.
    const diffs = diffConsecutivos([noviembre, septiembre, octubre]);

    expect(diffs).toHaveLength(2);
    expect(diffs[0]).toMatchObject({ from: '2026-09-01', to: '2026-10-01' });
    expect(diffs[1]).toMatchObject({ from: '2026-10-01', to: '2026-11-01' });
  });

  it('con un solo mes no hay nada que comparar', () => {
    expect(diffConsecutivos([octubre])).toEqual([]);
    expect(diffConsecutivos([])).toEqual([]);
  });
});
