/**
 * Verifica agrupar por departamento, filtrar y las barras de la vista Día del
 * horario completo (plan §7.4).
 */

import { describe, expect, it } from 'vitest';
import {
  agruparPorDepartamento,
  barraDeAyer,
  barraDeHoy,
  contarEnTurno,
  filtrarPersonas,
} from '../../src/domain/grid.ts';
import { indexarMes } from '../../src/domain/presence.ts';
import type { ParsedMonth, ShiftValue, SheetPerson } from '../../src/domain/types.ts';

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

describe('agruparPorDepartamento', () => {
  it('agrupa por departamento y ordena los grupos alfabéticamente', () => {
    const personas = [
      persona({ key: 'a', displayName: 'Zoe', department: 'CC N2', role: 'N2', site: 'Tuscania' }),
      persona({ key: 'b', displayName: 'Ana', department: 'MEGA N1' }),
      persona({ key: 'c', displayName: 'Beto', department: 'CC N2', role: 'N2', site: 'Tuscania' }),
    ];
    const grupos = agruparPorDepartamento(personas);
    expect(grupos.map((g) => g.department)).toEqual(['CC N2', 'MEGA N1']);
    expect(grupos[0]?.role).toBe('N2');
    expect(grupos[0]?.site).toBe('Tuscania');
  });

  it('ordena las personas dentro de un grupo por nombre a mostrar', () => {
    const personas = [
      persona({ key: 'a', displayName: 'Zoe' }),
      persona({ key: 'b', displayName: 'Ana' }),
    ];
    const [grupo] = agruparPorDepartamento(personas);
    expect(grupo?.personas.map((p) => p.displayName)).toEqual(['Ana', 'Zoe']);
  });
});

describe('filtrarPersonas', () => {
  const personas = [
    persona({ key: 'a', displayName: 'José Pérez', department: 'MEGA N1', role: 'N1', site: 'Megacentro' }),
    persona({ key: 'b', displayName: 'Ana Gómez', department: 'CC N2', role: 'N2', site: 'Tuscania' }),
  ];

  it('sin filtros devuelve todas', () => {
    expect(filtrarPersonas(personas, { texto: '', site: 'Todas', role: 'Todos' })).toHaveLength(2);
  });

  it('filtra por texto sin tildes', () => {
    const resultado = filtrarPersonas(personas, { texto: 'jose', site: 'Todas', role: 'Todos' });
    expect(resultado.map((p) => p.key)).toEqual(['a']);
  });

  it('filtra por sede', () => {
    const resultado = filtrarPersonas(personas, { texto: '', site: 'Tuscania', role: 'Todos' });
    expect(resultado.map((p) => p.key)).toEqual(['b']);
  });

  it('filtra por rol', () => {
    const resultado = filtrarPersonas(personas, { texto: '', site: 'Todas', role: 'N1' });
    expect(resultado.map((p) => p.key)).toEqual(['a']);
  });

  it('combina los tres filtros', () => {
    const resultado = filtrarPersonas(personas, { texto: 'ana', site: 'Tuscania', role: 'N2' });
    expect(resultado.map((p) => p.key)).toEqual(['b']);
  });
});

describe('contarEnTurno', () => {
  const trabajo = (startMin: number, endMin: number): ShiftValue => ({ kind: 'work', startMin, endMin, raw: '' });
  const mes: ParsedMonth = {
    sheetName: 'noviembre',
    hidden: false,
    month: '2026-11-01',
    dates: ['2026-11-02'],
    people: [persona({ key: 'a', displayName: 'A' }), persona({ key: 'b', displayName: 'B' })],
    entries: [
      { personKey: 'a', date: '2026-11-02', department: 'MEGA N1', shift: trabajo(360, 900) },
      { personKey: 'b', date: '2026-11-02', department: 'MEGA N1', shift: { kind: 'off', raw: 'Libre' } },
    ],
  };
  const indice = indexarMes(mes);

  it('cuenta solo quienes tienen turno ese día', () => {
    expect(contarEnTurno(indice, mes.people, '2026-11-02')).toBe(1);
  });

  it('da 0 si nadie tiene turno', () => {
    expect(contarEnTurno(indice, mes.people, '2026-11-03')).toBe(0);
  });
});

describe('barraDeHoy', () => {
  it('un turno normal da la posición proporcional al día', () => {
    const b = barraDeHoy({ kind: 'work', startMin: 360, endMin: 840, raw: '' }); // 06:00-14:00
    expect(b.leftPct).toBeCloseTo(25, 5);
    expect(b.widthPct).toBeCloseTo(33.333, 2);
  });

  it('recorta lo que pasa de medianoche', () => {
    const b = barraDeHoy({ kind: 'work', startMin: 1200, endMin: 1800, raw: '' }); // 20:00-06:00(+1)
    expect(b.leftPct).toBeCloseTo((1200 / 1440) * 100, 5);
    expect(b.widthPct).toBeCloseTo(((1440 - 1200) / 1440) * 100, 5);
  });
});

describe('barraDeAyer', () => {
  it('null si ayer no fue un turno', () => {
    expect(barraDeAyer({ kind: 'off', raw: 'Libre' })).toBeNull();
  });

  it('null si el turno de ayer no cruzó medianoche', () => {
    expect(barraDeAyer({ kind: 'work', startMin: 360, endMin: 840, raw: '' })).toBeNull();
  });

  it('da la parte que cruza a hoy, desde las 00:00', () => {
    // 21:00-06:00: startMin 1260, endMin 1830 (cruza) -> hoy hasta las 06:00 (390 min)
    const b = barraDeAyer({ kind: 'work', startMin: 1260, endMin: 1830, raw: '' });
    expect(b).not.toBeNull();
    expect(b?.leftPct).toBe(0);
    expect(b?.widthPct).toBeCloseTo((390 / 1440) * 100, 5);
  });
});
