import { describe, expect, it } from 'vitest';
import {
  claveHorario,
  endsNextDay,
  esTurno,
  mismoHorario,
  parseShift,
  seSolapan,
  shiftBand,
  shiftCategory,
  shiftDuration,
} from '../../src/domain/shift.ts';

describe('parseShift: turnos', () => {
  it('interpreta un turno normal', () => {
    const s = parseShift('06:00-15:00');
    expect(s.kind).toBe('work');
    expect(s).toMatchObject({ startMin: 360, endMin: 900, raw: '06:00-15:00' });
  });

  it('tolera espacios alrededor del guion y una sola cifra en la hora', () => {
    expect(parseShift('6:00 - 15:00')).toMatchObject({ startMin: 360, endMin: 900 });
    expect(parseShift(' 06:00-15:00 ')).toMatchObject({ startMin: 360, endMin: 900 });
  });

  it('conserva el texto original en raw', () => {
    expect(parseShift('6:00 - 15:00').raw).toBe('6:00 - 15:00');
  });
});

// Es el criterio de aceptación del plan §6.5 y la razón del ADR-0008.
describe('parseShift: el turno que acaba a las 00:00 no cruza el día', () => {
  it('21:00-06:00 dura 9 h y termina al día siguiente', () => {
    const s = parseShift('21:00-06:00');
    expect(shiftDuration(s)).toBe(9 * 60);
    expect(endsNextDay(s)).toBe(true);
    expect(s).toMatchObject({ startMin: 1260, endMin: 1800 });
  });

  it('15:00-00:00 dura 9 h y NO lleva +1', () => {
    const s = parseShift('15:00-00:00');
    expect(shiftDuration(s)).toBe(9 * 60);
    expect(endsNextDay(s)).toBe(false);
    expect(s).toMatchObject({ startMin: 900, endMin: 1440 });
  });

  it('un turno de 24 h se interpreta como que cruza', () => {
    const s = parseShift('06:00-06:00');
    expect(shiftDuration(s)).toBe(24 * 60);
    expect(endsNextDay(s)).toBe(true);
  });
});

describe('parseShift: libre, vacaciones y sin dato', () => {
  it('reconoce Libre sin importar mayúsculas', () => {
    expect(parseShift('Libre').kind).toBe('off');
    expect(parseShift('LIBRE').kind).toBe('off');
    expect(parseShift('libre').kind).toBe('off');
    expect(parseShift(' Libre ').kind).toBe('off');
  });

  // Criterio del plan §6.5: las dos variantes dan el mismo resultado.
  it('VACACIONES y Vacaciones dan el mismo resultado', () => {
    expect(parseShift('Vacaciones').kind).toBe('vacation');
    expect(parseShift('VACACIONES').kind).toBe('vacation');
    expect(parseShift('vacaciones').kind).toBe('vacation');
    expect(parseShift('VACACIÓN').kind).toBe('vacation');
    expect(parseShift('vac. vacaciones').kind).toBe('vacation');
  });

  it('una celda vacía o desconocida queda como unknown y no rompe nada', () => {
    expect(parseShift('').kind).toBe('unknown');
    expect(parseShift(null).kind).toBe('unknown');
    expect(parseShift(undefined).kind).toBe('unknown');
    expect(parseShift('   ').kind).toBe('unknown');
    expect(parseShift('???').kind).toBe('unknown');
    expect(parseShift('INCAPACIDAD').kind).toBe('unknown');
  });

  it('guarda el texto original de lo que no reconoce, para poder avisarlo', () => {
    expect(parseShift('INCAPACIDAD').raw).toBe('INCAPACIDAD');
  });

  it('una hora imposible no se inventa: queda como unknown', () => {
    expect(parseShift('25:00-30:00').kind).toBe('unknown');
    expect(parseShift('10:75-11:00').kind).toBe('unknown');
    expect(parseShift('06:00-15:99').kind).toBe('unknown');
  });

  it('shiftDuration devuelve null si el día no es un turno', () => {
    expect(shiftDuration(parseShift('Libre'))).toBeNull();
    expect(shiftDuration(parseShift('Vacaciones'))).toBeNull();
    expect(shiftDuration(parseShift(''))).toBeNull();
  });

  it('endsNextDay es falso para lo que no es un turno', () => {
    expect(endsNextDay(parseShift('Libre'))).toBe(false);
  });

  it('esTurno distingue los días trabajados', () => {
    expect(esTurno(parseShift('06:00-15:00'))).toBe(true);
    expect(esTurno(parseShift('Libre'))).toBe(false);
  });
});

describe('shiftCategory: color por la hora de entrada', () => {
  it('antes de las 12:00 es mañana/día', () => {
    expect(shiftCategory(parseShift('06:00-15:00'))).toBe('manana');
    expect(shiftCategory(parseShift('11:59-20:00'))).toBe('manana');
  });

  it('de 12:00 a 16:59 es tarde', () => {
    expect(shiftCategory(parseShift('12:00-21:00'))).toBe('tarde');
    expect(shiftCategory(parseShift('14:00-23:00'))).toBe('tarde');
    expect(shiftCategory(parseShift('16:59-02:00'))).toBe('tarde');
  });

  it('de 17:00 en adelante es noche', () => {
    expect(shiftCategory(parseShift('17:00-02:00'))).toBe('noche');
    expect(shiftCategory(parseShift('21:00-06:00'))).toBe('noche');
    expect(shiftCategory(parseShift('00:00-08:00'))).toBe('manana');
  });

  it('libre y vacaciones tienen su propio color', () => {
    expect(shiftCategory(parseShift('Libre'))).toBe('libre');
    expect(shiftCategory(parseShift('Vacaciones'))).toBe('vacaciones');
    expect(shiftCategory(parseShift(''))).toBe('libre');
  });
});

describe('shiftBand: franjas del panel', () => {
  // Ojo: no es lo mismo que la categoría de color. Aquí 08:00 separa.
  it('separa Mañana y Día a las 08:00', () => {
    expect(shiftBand(parseShift('06:00-15:00'))).toBe('Mañana');
    expect(shiftBand(parseShift('07:59-16:00'))).toBe('Mañana');
    expect(shiftBand(parseShift('08:00-17:00'))).toBe('Día');
    expect(shiftBand(parseShift('11:59-20:00'))).toBe('Día');
  });

  it('Tarde de 12:00 a 16:59 y Noche desde las 17:00', () => {
    expect(shiftBand(parseShift('12:00-21:00'))).toBe('Tarde');
    expect(shiftBand(parseShift('16:59-02:00'))).toBe('Tarde');
    expect(shiftBand(parseShift('17:00-02:00'))).toBe('Noche');
    expect(shiftBand(parseShift('21:00-06:00'))).toBe('Noche');
  });

  it('las franjas solo cuentan turnos', () => {
    expect(shiftBand(parseShift('Libre'))).toBeNull();
    expect(shiftBand(parseShift('Vacaciones'))).toBeNull();
    expect(shiftBand(parseShift(''))).toBeNull();
  });
});

describe('mismoHorario y claveHorario', () => {
  it('compara lo interpretado, no el texto', () => {
    expect(mismoHorario(parseShift('06:00-15:00'), parseShift('6:00 - 15:00'))).toBe(true);
    expect(claveHorario(parseShift('06:00-15:00'))).toBe(claveHorario(parseShift('6:00 - 15:00')));
  });

  it('horarios distintos no coinciden', () => {
    expect(mismoHorario(parseShift('06:00-15:00'), parseShift('06:00-14:00'))).toBe(false);
    expect(mismoHorario(parseShift('07:00-16:00'), parseShift('06:00-15:00'))).toBe(false);
  });

  // Importante para «Mismo horario», que se deshabilita en día libre (§7.1).
  it('dos días libres no son «el mismo horario»', () => {
    expect(mismoHorario(parseShift('Libre'), parseShift('Libre'))).toBe(false);
    expect(claveHorario(parseShift('Libre'))).toBeNull();
  });
});

describe('seSolapan', () => {
  it('detecta solape entre turnos del mismo día', () => {
    expect(seSolapan(parseShift('06:00-15:00'), parseShift('14:00-23:00'))).toBe(true);
    expect(seSolapan(parseShift('06:00-15:00'), parseShift('06:00-15:00'))).toBe(true);
  });

  it('turnos que solo se tocan en el extremo no se solapan', () => {
    expect(seSolapan(parseShift('06:00-14:00'), parseShift('14:00-23:00'))).toBe(false);
  });

  it('un turno nocturno se solapa con lo que pasa de medianoche', () => {
    expect(seSolapan(parseShift('21:00-06:00'), parseShift('23:00-07:00'))).toBe(true);
  });

  it('libre no se solapa con nada', () => {
    expect(seSolapan(parseShift('Libre'), parseShift('06:00-15:00'))).toBe(false);
  });
});
