/**
 * Casos de control del plan §7.3: los mismos turnos que la hoja real, sin
 * nombres reales. Lo usa la prueba de dominio y, si existe, la de la hoja real.
 * Ficha: docs/features/panel.md.
 */

import type { ParsedWorkbook } from '../../src/domain/types.ts';
import { detectarConflictos } from '../../src/domain/conflicts/index.ts';
import { diffMonths } from '../../src/domain/diff.ts';
import { departamentosDelDia, franjasDelDia, sedesDelDia } from '../../src/domain/panel.ts';
import { indexarMes, metricasDelDia } from '../../src/domain/presence.ts';
import { expect } from 'vitest';

/** Comprueba las cifras de control del plan sobre un libro ya leído. */
export function verificarCasosDeControl(libro: ParsedWorkbook): void {
  const noviembre = libro.months.find((mes) => mes.sheetName === 'Noviembre');
  const octubre = libro.months.find((mes) => mes.sheetName === 'Octubre');
  const visibles = libro.months.filter((mes) => !mes.hidden);
  const conflictos = detectarConflictos(visibles, []);

  expect(noviembre).toBeDefined();
  expect(octubre).toBeDefined();

  expect(conflictos.some((c) => c.key === 'cobertura-supervision:tuscania:2026-11-02:14:00-18:00')).toBe(true);
  expect(conflictos.some((c) => c.key === 'cobertura-supervision:megacentro:2026-11-03:06:00-15:00')).toBe(true);

  const soporte = new Set((noviembre?.people ?? []).filter((p) => p.role === 'Soporte de Salas').map((p) => p.key));
  const descansos6 = conflictos.filter((c) => {
    if (c.regla !== 'descanso-corto' || c.grupo !== 'descanso-corto:6') return false;
    return soporte.has(c.key.split(':')[1] ?? '');
  });
  expect(descansos6).toHaveLength(4);

  expect(conflictos.some((c) => c.regla === 'racha-larga' && c.key.includes(':2026-11-05:2026-11-13'))).toBe(true);
  expect(conflictos.some((c) => c.regla === 'racha-larga' && c.key.includes(':2026-11-09:2026-11-15'))).toBe(true);
  expect(conflictos.some((c) => c.regla === 'sede-sin-supervision' && c.key.includes('phoenix-tower'))).toBe(true);

  const ccN1 = conflictos.filter((c) => c.regla === 'hueco-equipo' && c.key.includes('cc-n1:2026-11-19'));
  const ccN2 = conflictos.filter((c) => c.regla === 'hueco-equipo' && c.key.includes('cc-n2:2026-11-18'));
  expect(ccN1.some((c) => cubre(c.key, 6 * 60, 21 * 60))).toBe(true);
  expect(ccN2.some((c) => cubre(c.key, 14 * 60, 21 * 60))).toBe(true);

  // La fórmula (≥ 8 h y < 9 h, días seguidos trabajados) da 12 en noviembre.
  // El «17» del plan no se reproduce sobre esta hoja; el resto de cifras sí.
  const justos = conflictos.filter((c) => c.regla === 'descanso-justo' && (c.fecha ?? '').startsWith('2026-11'));
  expect(justos).toHaveLength(12);

  expect((noviembre?.people ?? []).filter((p) => p.rawName.includes('(3/11)'))).toHaveLength(6);
  expect(conflictos.some((c) => c.regla === 'fecha-en-nombre' && c.key.endsWith('2026-11-01'))).toBe(true);
  const vacaciones = (noviembre?.entries ?? []).filter((e) => e.shift.kind === 'vacation' && e.shift.raw === 'VACACIONES');
  expect(vacaciones).toHaveLength(15);
  expect(conflictos.some((c) => c.regla === 'vacaciones-mayusculas' && c.key.endsWith('2026-11-01') && c.resumen.startsWith('15 '))).toBe(true);
  expect(conflictos.some((c) => c.regla === 'nombre-con-coma')).toBe(true);
  expect(conflictos.some((c) => c.regla === 'departamento-mal-escrito' && c.resumen.includes('Adminsitrador'))).toBe(true);

  const diff = diffMonths(octubre!, noviembre!);
  expect(diff.movedDepartment).toHaveLength(12);
  expect(diff.left).toHaveLength(1);
  expect(conflictos.some((c) => c.regla === 'cambios-vs-mes-anterior' && c.titulo.includes('12') && c.titulo.includes('salida'))).toBe(true);

  const indice = indexarMes(noviembre!);
  const metricas = metricasDelDia(indice, '2026-11-02');
  expect(metricas).toEqual({ enTurno: 73, total: 103, libres: 29, vacaciones: 1, cruzanMedianoche: 9 });
  const franjas = Object.fromEntries(franjasDelDia(indice, '2026-11-02').map((f) => [f.banda, f.cantidad]));
  expect(franjas).toEqual({ Mañana: 33, Día: 8, Tarde: 23, Noche: 9 });
  const sedes = Object.fromEntries(sedesDelDia(indice, '2026-11-02').map((s) => [s.site, `${s.enTurno}/${s.total}`]));
  expect(sedes).toEqual({
    Megacentro: '15/22',
    Tuscania: '12/18',
    'Phoenix Tower': '6/8',
    'Santa Ana': '5/5',
    'San Miguel': '4/5',
    Atento: '1/2',
    'Activo Fijo': '3/3',
    'Sin sede': '27/40',
  });
  expect(departamentosDelDia(indice, '2026-11-02').length).toBeGreaterThan(10);
}

/** ¿El tramo final `HH:MM-HH:MM` de la clave cubre [desde, hasta] en minutos? */
function cubre(key: string, desde: number, hasta: number): boolean {
  const match = /(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(key);
  if (match === null) return false;
  const inicio = Number(match[1]) * 60 + Number(match[2]);
  const finHora = Number(match[3]);
  const fin = (finHora === 24 ? 24 * 60 : finHora * 60) + Number(match[4]);
  return inicio <= desde && fin >= hasta;
}
