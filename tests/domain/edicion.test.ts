/**
 * Verifica horarios frecuentes, avisos de descanso y compañeros/apoyo del
 * panel «Cambiar un día» (plan §7.5).
 */

import { describe, expect, it } from 'vitest';
import {
  avisosDescanso,
  companerosYApoyo,
  DESCANSO_MINIMO_MIN,
  TURNO_MAXIMO_MIN,
  turnosFrecuentes,
} from '../../src/domain/edicion.ts';
import { indexarOverrides, type DayOverride } from '../../src/domain/overlay.ts';
import { indexarMes } from '../../src/domain/presence.ts';
import type { ParsedMonth, ScheduleEntry, ShiftValue, SheetPerson } from '../../src/domain/types.ts';

function persona(overrides: Partial<SheetPerson> & { key: string; displayName: string }): SheetPerson {
  return {
    rawName: overrides.displayName,
    department: 'MEGA N1',
    role: 'N1',
    site: 'Megacentro',
    area: null,
    joinedOn: null,
    needsReview: false,
    row: 1,
    ...overrides,
  };
}

const trabajo = (startMin: number, endMin: number): Extract<ShiftValue, { kind: 'work' }> => ({
  kind: 'work',
  startMin,
  endMin,
  raw: '',
});

describe('turnosFrecuentes', () => {
  function entrada(department: string, shift: ShiftValue): ScheduleEntry {
    return { personKey: 'x', date: '2026-11-02', department, shift };
  }

  it('cuenta solo las entradas del departamento pedido', () => {
    const entries = [
      entrada('MEGA N1', trabajo(360, 900)),
      entrada('MEGA N1', trabajo(360, 900)),
      entrada('CC N1', trabajo(480, 960)),
    ];
    expect(turnosFrecuentes(entries, 'MEGA N1')).toEqual(['06:00-15:00']);
  });

  it('ordena por frecuencia, de mayor a menor', () => {
    const entries = [
      entrada('MEGA N1', trabajo(360, 900)), // 06:00-15:00 x1
      entrada('MEGA N1', trabajo(840, 1380)), // 14:00-23:00 x2
      entrada('MEGA N1', trabajo(840, 1380)),
    ];
    expect(turnosFrecuentes(entries, 'MEGA N1')).toEqual(['14:00-23:00', '06:00-15:00']);
  });

  it('ignora Libre y Vacaciones', () => {
    const entries = [entrada('MEGA N1', { kind: 'off', raw: 'Libre' }), entrada('MEGA N1', trabajo(360, 900))];
    expect(turnosFrecuentes(entries, 'MEGA N1')).toEqual(['06:00-15:00']);
  });

  it('se limita a la cantidad pedida', () => {
    const entries = Array.from({ length: 8 }, (_, i) => entrada('MEGA N1', trabajo(i * 60, i * 60 + 480)));
    expect(turnosFrecuentes(entries, 'MEGA N1', 6)).toHaveLength(6);
  });
});

describe('avisosDescanso', () => {
  it('sin turno antes ni después, y duración normal: sin avisos', () => {
    expect(avisosDescanso(null, null, trabajo(360, 900))).toEqual([]);
  });

  it('avisa si el descanso con ayer es menor al mínimo', () => {
    // Ayer 21:00-06:00 (termina a las 06:00 de hoy, endMin 1830); hoy empieza 08:00: 90 min de descanso.
    const ayer = trabajo(1260, 1830);
    const avisos = avisosDescanso(ayer, null, trabajo(480, 960));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('de descanso desde el turno del día anterior');
  });

  it('avisa si el descanso con mañana es menor al mínimo', () => {
    // Hoy 14:00-22:00 (8h, sin aviso de duración); mañana empieza 05:00: 7 h de descanso, menos de 8.
    const manana = trabajo(300, 840);
    const avisos = avisosDescanso(null, manana, trabajo(840, 1320));
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('de descanso antes del turno del día siguiente');
  });

  it('no avisa si el descanso llega justo al mínimo', () => {
    const ayer = trabajo(0, 600); // termina 10:00
    const nuevo = trabajo(600 + DESCANSO_MINIMO_MIN, 1200 + DESCANSO_MINIMO_MIN); // empieza justo 8h después
    expect(avisosDescanso(ayer, null, nuevo)).toEqual([]);
  });

  it('avisa si el turno dura más del máximo', () => {
    const nuevo = trabajo(360, 360 + TURNO_MAXIMO_MIN + 1);
    const avisos = avisosDescanso(null, null, nuevo);
    expect(avisos).toContain('El turno dura más de 12 horas.');
  });

  it('puede dar varios avisos a la vez', () => {
    const ayer = trabajo(1260, 1830); // termina 06:00 de hoy
    const nuevo = trabajo(420, 420 + TURNO_MAXIMO_MIN + 60); // empieza 07:00, dura > 12h
    const avisos = avisosDescanso(ayer, null, nuevo);
    expect(avisos.length).toBeGreaterThanOrEqual(2);
  });
});

describe('companerosYApoyo', () => {
  const mes: ParsedMonth = {
    sheetName: 'noviembre',
    hidden: false,
    month: '2026-11-01',
    dates: ['2026-11-02'],
    people: [
      persona({ key: 'a', displayName: 'Ana', site: 'Megacentro' }),
      persona({ key: 'b', displayName: 'Beto', site: 'Megacentro' }),
      persona({ key: 'c', displayName: 'Carla', site: 'Megacentro' }),
      persona({ key: 'd', displayName: 'Dora', site: 'Tuscania' }),
    ],
    entries: [
      { personKey: 'a', date: '2026-11-02', department: 'MEGA N1', shift: trabajo(360, 900) },
      { personKey: 'b', date: '2026-11-02', department: 'MEGA N1', shift: trabajo(360, 900) }, // coincide con a
      { personKey: 'c', date: '2026-11-02', department: 'MEGA N1', shift: trabajo(480, 1020) }, // se solapa
      { personKey: 'd', date: '2026-11-02', department: 'CC N1', shift: trabajo(360, 900) }, // otra sede
    ],
  };
  const indice = indexarMes(mes);
  const sinOverrides = indexarOverrides([]);

  it('lista a quien tiene exactamente el mismo horario en la misma sede', () => {
    const { coincidentes } = companerosYApoyo(indice, sinOverrides, '2026-11-02', trabajo(360, 900), 'Megacentro', 'a');
    expect(coincidentes.map((p) => p.key)).toEqual(['b']);
  });

  it('lista como apoyo a quien se solapa sin coincidir exacto', () => {
    const { apoyos } = companerosYApoyo(indice, sinOverrides, '2026-11-02', trabajo(360, 900), 'Megacentro', 'a');
    expect(apoyos.map((p) => p.key)).toEqual(['c']);
  });

  it('nunca incluye a la propia persona', () => {
    const { coincidentes, apoyos } = companerosYApoyo(indice, sinOverrides, '2026-11-02', trabajo(360, 900), 'Megacentro', 'a');
    expect([...coincidentes, ...apoyos].some((p) => p.key === 'a')).toBe(false);
  });

  it('respeta la sede: nadie cuenta en una sede donde no hay nadie', () => {
    const { coincidentes, apoyos } = companerosYApoyo(indice, sinOverrides, '2026-11-02', trabajo(360, 900), 'Santa Ana', 'a');
    expect(coincidentes).toHaveLength(0);
    expect(apoyos).toHaveLength(0);
  });

  it('usa la sede del cambio de jefatura vigente de esa persona, si lo hay', () => {
    const overrides: DayOverride[] = [
      {
        personKey: 'd',
        date: '2026-11-02',
        kind: 'work',
        startMin: 360,
        endMin: 900,
        site: 'Megacentro',
        reason: 'Apoyo a otra sede',
        note: null,
        supportPersonKey: null,
        conflictKey: null,
        createdAt: '2026-11-01T00:00:00Z',
      },
    ];
    const { coincidentes } = companerosYApoyo(indice, indexarOverrides(overrides), '2026-11-02', trabajo(360, 900), 'Megacentro', 'a');
    expect(coincidentes.map((p) => p.key)).toContain('d');
  });
});
