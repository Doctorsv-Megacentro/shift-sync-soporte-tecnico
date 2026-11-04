import { describe, expect, it } from 'vitest';
import {
  addDays,
  coerceDateKey,
  diffDays,
  esDateKey,
  firstOfMonth,
  formatDuration,
  formatFechaCorta,
  formatFechaLarga,
  formatMinutes,
  nombreDia,
  nombreMes,
  parseDateKey,
  parseMinutes,
  startOfWeek,
  toDateKey,
  weekDates,
  weekday,
} from '../../src/domain/time.ts';

describe('toDateKey', () => {
  it('rellena con ceros', () => {
    expect(toDateKey(2026, 1, 5)).toBe('2026-01-05');
    expect(toDateKey(2026, 11, 30)).toBe('2026-11-30');
  });

  it('rechaza fechas que no existen en el calendario', () => {
    expect(toDateKey(2026, 2, 30)).toBeNull();
    expect(toDateKey(2026, 2, 29)).toBeNull(); // 2026 no es bisiesto
    expect(toDateKey(2024, 2, 29)).toBe('2024-02-29'); // 2024 sí
    expect(toDateKey(2026, 13, 1)).toBeNull();
    expect(toDateKey(2026, 0, 1)).toBeNull();
    expect(toDateKey(2026, 4, 31)).toBeNull();
  });

  it('rechaza valores que no son enteros', () => {
    expect(toDateKey(2026.5, 1, 1)).toBeNull();
    expect(toDateKey(Number.NaN, 1, 1)).toBeNull();
  });
});

describe('esDateKey', () => {
  it('acepta solo fechas reales en formato ISO', () => {
    expect(esDateKey('2026-11-02')).toBe(true);
    expect(esDateKey('2026-02-30')).toBe(false);
    expect(esDateKey('2026-11-2')).toBe(false);
    expect(esDateKey('02/11/2026')).toBe(false);
    expect(esDateKey(45000)).toBe(false);
    expect(esDateKey(null)).toBe(false);
  });
});

describe('coerceDateKey', () => {
  // Es el caso que de verdad ocurre: SheetJS con `raw: true` da seriales.
  it('interpreta el serial de Excel', () => {
    const clave = coerceDateKey(46327);
    expect(clave).toBe('2026-11-01');
    expect(nombreDia(clave as string)).toBe('domingo');
    expect(coerceDateKey(46356)).toBe('2026-11-30');
    expect(coerceDateKey(46296)).toBe('2026-10-01');
  });

  it('compensa el 29-feb-1900 que Excel cuenta y el calendario no tiene', () => {
    expect(coerceDateKey(1)).toBe('1900-01-01');
    expect(coerceDateKey(59)).toBe('1900-02-28');
    expect(coerceDateKey(60)).toBeNull(); // el dia ficticio: no es ninguna fecha
    expect(coerceDateKey(61)).toBe('1900-03-01');
    expect(coerceDateKey(25569)).toBe('1970-01-01');
  });

  it('un serial con parte decimal (fecha y hora) da su dia', () => {
    expect(coerceDateKey(46327.5)).toBe('2026-11-01');
  });

  it('interpreta un Date leyendo sus partes locales', () => {
    expect(coerceDateKey(new Date(2026, 10, 2))).toBe('2026-11-02');
  });

  it('interpreta texto ISO y dd/mm/yyyy', () => {
    expect(coerceDateKey('2026-11-02')).toBe('2026-11-02');
    expect(coerceDateKey('02/11/2026')).toBe('2026-11-02');
    expect(coerceDateKey('2-11-2026')).toBe('2026-11-02');
    expect(coerceDateKey(' 2026-11-02 ')).toBe('2026-11-02');
  });

  it('interpreta un serial que viene como texto', () => {
    expect(coerceDateKey('46327')).toBe('2026-11-01');
  });

  // Lo esencial del contrato de la hoja: distinguir un día de lo que no lo es.
  it('devuelve null para lo que no es una fecha', () => {
    expect(coerceDateKey(null)).toBeNull();
    expect(coerceDateKey(undefined)).toBeNull();
    expect(coerceDateKey('')).toBeNull();
    expect(coerceDateKey('184/163')).toBeNull(); // encabezado de horas de Septiembre
    expect(coerceDateKey('Libres por periodo')).toBeNull(); // última columna de Septiembre
    expect(coerceDateKey('lunes')).toBeNull(); // fila 1
    expect(coerceDateKey(0)).toBeNull();
    expect(coerceDateKey(-5)).toBeNull();
    expect(coerceDateKey(new Date('no es fecha'))).toBeNull();
    expect(coerceDateKey({})).toBeNull();
  });
});

describe('parseDateKey', () => {
  it('descompone la fecha', () => {
    expect(parseDateKey('2026-11-02')).toEqual({ year: 2026, month: 11, day: 2 });
  });

  it('lanza si el formato no es el esperado', () => {
    expect(() => parseDateKey('02/11/2026')).toThrow(/inválido/);
  });
});

describe('addDays y diffDays', () => {
  it('suma y resta cruzando mes y año', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-11-02', 0)).toBe('2026-11-02');
  });

  it('cuenta los días entre dos fechas', () => {
    expect(diffDays('2026-11-02', '2026-11-09')).toBe(7);
    expect(diffDays('2026-11-09', '2026-11-02')).toBe(-7);
    expect(diffDays('2026-10-31', '2026-11-01')).toBe(1);
    expect(diffDays('2026-11-02', '2026-11-02')).toBe(0);
  });
});

describe('la semana empieza en lunes', () => {
  it('weekday pone el lunes en 0 y el domingo en 6', () => {
    expect(weekday('2026-11-02')).toBe(0); // lunes
    expect(weekday('2026-11-08')).toBe(6); // domingo
  });

  it('startOfWeek devuelve el lunes, y el domingo pertenece a la semana anterior', () => {
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-05')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
  });

  it('weekDates da los 7 días de lunes a domingo', () => {
    expect(weekDates('2026-11-05')).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05',
      '2026-11-06', '2026-11-07', '2026-11-08',
    ]);
  });

  it('una semana puede cruzar al mes anterior', () => {
    expect(weekDates('2026-11-01')).toEqual([
      '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29',
      '2026-10-30', '2026-10-31', '2026-11-01',
    ]);
  });
});

describe('firstOfMonth', () => {
  it('identifica el mes por su primer día', () => {
    expect(firstOfMonth('2026-11-30')).toBe('2026-11-01');
    expect(firstOfMonth('2026-11-01')).toBe('2026-11-01');
  });
});

describe('formatMinutes y parseMinutes', () => {
  it('formatea minutos como HH:MM', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(6 * 60)).toBe('06:00');
    expect(formatMinutes(21 * 60)).toBe('21:00');
    expect(formatMinutes(14 * 60 + 30)).toBe('14:30');
  });

  it('normaliza lo que pasa de 24 h, que es como se guarda un turno nocturno', () => {
    expect(formatMinutes(1440)).toBe('00:00');
    expect(formatMinutes(1800)).toBe('06:00'); // 21:00-06:00 guarda 1800
  });

  it('parseMinutes es la vuelta, y rechaza horas imposibles', () => {
    expect(parseMinutes('06:00')).toBe(360);
    expect(parseMinutes('6:00')).toBe(360);
    expect(parseMinutes('00:00')).toBe(0);
    expect(parseMinutes('24:00')).toBe(1440);
    expect(parseMinutes('24:30')).toBeNull();
    expect(parseMinutes('25:00')).toBeNull();
    expect(parseMinutes('06:60')).toBeNull();
    expect(parseMinutes('seis')).toBeNull();
  });
});

describe('formatDuration', () => {
  it('escribe la duración como se lee en la tarjeta del día', () => {
    expect(formatDuration(540)).toBe('9 h');
    expect(formatDuration(510)).toBe('8 h 30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(0)).toBe('0 min');
  });
});

describe('nombres y formatos en español', () => {
  it('nombra días y meses', () => {
    expect(nombreDia('2026-11-02')).toBe('lunes');
    expect(nombreDia('2026-11-04')).toBe('miércoles');
    expect(nombreMes('2026-11-02')).toBe('noviembre');
    expect(nombreMes('2026-09-01')).toBe('septiembre');
  });

  it('formatea fechas largas y cortas', () => {
    expect(formatFechaLarga('2026-11-02')).toBe('lunes 2 de noviembre');
    expect(formatFechaCorta('2026-11-02')).toBe('2 nov');
  });
});
