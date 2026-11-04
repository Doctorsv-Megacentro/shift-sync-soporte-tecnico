import { describe, expect, it } from 'vitest';
import {
  aplicarCambios,
  buscarOverride,
  claveOverride,
  entradaEfectiva,
  indexarOverrides,
  shiftDeOverride,
  tieneCambio,
  type DayOverride,
} from '../../src/domain/overlay.ts';
import { parseShift } from '../../src/domain/shift.ts';
import type { ScheduleEntry } from '../../src/domain/types.ts';

// Nombres ficticios (ADR-0011).

function entrada(personKey: string, date: string, raw: string, department = 'MEGA N1'): ScheduleEntry {
  return { personKey, date, department, shift: parseShift(raw) };
}

function override(parcial: Partial<DayOverride> & Pick<DayOverride, 'personKey' | 'date'>): DayOverride {
  return {
    kind: 'work',
    startMin: 360,
    endMin: 900,
    site: null,
    reason: 'Cambio de turno',
    note: null,
    supportPersonKey: null,
    createdAt: '2026-11-01',
    ...parcial,
  };
}

describe('claveOverride, indexarOverrides, buscarOverride', () => {
  it('indexa por persona y fecha', () => {
    const o = override({ personKey: 'ANA ROSALES', date: '2026-11-02' });
    const indice = indexarOverrides([o]);

    expect(indice.get(claveOverride('ANA ROSALES', '2026-11-02'))).toBe(o);
    expect(buscarOverride(indice, 'ANA ROSALES', '2026-11-02')).toBe(o);
  });

  it('devuelve null si no hay cambio para esa persona o fecha', () => {
    const indice = indexarOverrides([override({ personKey: 'ANA ROSALES', date: '2026-11-02' })]);
    expect(buscarOverride(indice, 'ANA ROSALES', '2026-11-03')).toBeNull();
    expect(buscarOverride(indice, 'OTRA PERSONA', '2026-11-02')).toBeNull();
  });
});

describe('shiftDeOverride', () => {
  it('un cambio a turno da un ShiftValue de trabajo', () => {
    const s = shiftDeOverride(override({ personKey: 'x', date: '2026-11-02', kind: 'work', startMin: 360, endMin: 900 }));
    expect(s).toMatchObject({ kind: 'work', startMin: 360, endMin: 900, raw: '06:00-15:00' });
  });

  // El mismo caso que ADR-0008: un cambio a un turno que termina 00:00.
  it('conserva la regla de que 00:00 no cruza', () => {
    const s = shiftDeOverride(override({ personKey: 'x', date: '2026-11-02', kind: 'work', startMin: 900, endMin: 1440 }));
    expect(s.raw).toBe('15:00-00:00');
  });

  it('un cambio a libre o vacaciones da el ShiftValue correspondiente', () => {
    expect(shiftDeOverride(override({ personKey: 'x', date: 'd', kind: 'off', startMin: null, endMin: null })).kind).toBe('off');
    expect(shiftDeOverride(override({ personKey: 'x', date: 'd', kind: 'vacation', startMin: null, endMin: null })).kind).toBe('vacation');
  });
});

describe('entradaEfectiva', () => {
  it('sin cambio, devuelve la entrada tal cual', () => {
    const e = entrada('ANA ROSALES', '2026-11-02', '06:00-15:00');
    expect(entradaEfectiva(e, null)).toBe(e);
  });

  it('con cambio, el turno es el del cambio pero el departamento es el de la hoja', () => {
    const e = entrada('ANA ROSALES', '2026-11-02', '06:00-15:00', 'MEGA N1');
    const o = override({ personKey: 'ANA ROSALES', date: '2026-11-02', startMin: 840, endMin: 1380 });
    const efectiva = entradaEfectiva(e, o);

    expect(efectiva.shift).toMatchObject({ startMin: 840, endMin: 1380 });
    expect(efectiva.department).toBe('MEGA N1');
  });
});

describe('aplicarCambios', () => {
  it('mezcla varias entradas con sus cambios, dejando intactas las que no tienen', () => {
    const entradas = [
      entrada('ANA ROSALES', '2026-11-02', '06:00-15:00'),
      entrada('ANA ROSALES', '2026-11-03', 'Libre'),
      entrada('SOFIA MOLINA', '2026-11-02', '14:00-23:00'),
    ];
    const cambios = [override({ personKey: 'ANA ROSALES', date: '2026-11-03', kind: 'work', startMin: 360, endMin: 900 })];

    const efectivas = aplicarCambios(entradas, cambios);

    expect(efectivas[0]?.shift.kind).toBe('work'); // sin cambio
    expect(efectivas[1]?.shift).toMatchObject({ kind: 'work', startMin: 360, endMin: 900 }); // con cambio
    expect(efectivas[2]?.shift.kind).toBe('work'); // de otra persona, sin cambio
  });

  it('sin cambios, el resultado es equivalente a las entradas originales', () => {
    const entradas = [entrada('ANA ROSALES', '2026-11-02', '06:00-15:00')];
    expect(aplicarCambios(entradas, [])).toEqual(entradas);
  });
});

describe('tieneCambio', () => {
  it('distingue un día con cambio de uno sin cambio, para el punto naranja', () => {
    const indice = indexarOverrides([override({ personKey: 'ANA ROSALES', date: '2026-11-02' })]);
    expect(tieneCambio(indice, 'ANA ROSALES', '2026-11-02')).toBe(true);
    expect(tieneCambio(indice, 'ANA ROSALES', '2026-11-03')).toBe(false);
  });
});
