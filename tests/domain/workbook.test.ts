import { describe, expect, it } from 'vitest';
import {
  esPestanaIgnorada,
  indexarEntradas,
  letraColumna,
  parseWorkbook,
  resumirMes,
} from '../../src/domain/workbook.ts';
import { construirLibro, mesSencillo, serial, serialesDelMes } from '../fixtures/construir.ts';

// Todos los nombres de estas pruebas son ficticios (ADR-0011).

describe('pestañas que no son un mes', () => {
  it('reconoce CONTACTOS y el prefijo _', () => {
    expect(esPestanaIgnorada('CONTACTOS')).toBe(true);
    expect(esPestanaIgnorada('Contactos')).toBe(true);
    expect(esPestanaIgnorada('_borrador')).toBe(true);
    expect(esPestanaIgnorada('_')).toBe(true);
    expect(esPestanaIgnorada('')).toBe(true);
    expect(esPestanaIgnorada('Noviembre')).toBe(false);
  });

  it('las ignora sin romper la carga y deja aviso', () => {
    const libro = construirLibro([
      mesSencillo('Noviembre'),
      { nombre: 'CONTACTOS', filas: [['nombre', 'telefono']] },
      { nombre: '_notas', filas: [['lo que sea']] },
    ]);
    const r = parseWorkbook(libro);

    expect(r.months).toHaveLength(1);
    expect(r.months[0]?.sheetName).toBe('Noviembre');
    expect(r.skipped.map((s) => s.sheetName)).toEqual(['CONTACTOS', '_notas']);
    expect(r.warnings.filter((w) => w.code === 'pestana-ignorada')).toHaveLength(2);
  });

  it('una pestaña sin fechas en la fila 2 se salta con su motivo', () => {
    const libro = construirLibro([
      mesSencillo(),
      { nombre: 'Resumen', filas: [['total'], ['no hay fechas aquí'], ['x', 'y']] },
    ]);
    const r = parseWorkbook(libro);

    expect(r.months).toHaveLength(1);
    expect(r.skipped[0]?.sheetName).toBe('Resumen');
    expect(r.skipped[0]?.reason).toMatch(/fila 2/);
  });
});

describe('pestañas ocultas', () => {
  // Criterio del plan §6.5: se listan, pero no se seleccionan por defecto.
  it('se leen y quedan marcadas como ocultas', () => {
    const libro = construirLibro([
      { ...mesSencillo('Septiembre'), oculta: true },
      mesSencillo('Noviembre'),
    ]);
    const r = parseWorkbook(libro);

    expect(r.months).toHaveLength(2);
    expect(r.months.find((m) => m.sheetName === 'Septiembre')?.hidden).toBe(true);
    expect(r.months.find((m) => m.sheetName === 'Noviembre')?.hidden).toBe(false);
  });
});

describe('la fila 2 manda: qué columna es un día', () => {
  // Es el caso real de Septiembre, que empieza las fechas en la columna D.
  it('las fechas pueden empezar en la columna D, no solo en la C', () => {
    const libro = construirLibro([{
      nombre: 'Septiembre',
      filas: [
        ['', '', '184/163', 'martes', 'miércoles'],
        ['', '', null, serial('2026-09-01'), serial('2026-09-02')],
        ['MEGA N1', 'ROSALES ANA', '=SUM(X)', '06:00-15:00', 'Libre'],
      ],
    }]);
    const r = parseWorkbook(libro);
    const mes = r.months[0];

    expect(mes?.dates).toEqual(['2026-09-01', '2026-09-02']);
    expect(mes?.month).toBe('2026-09-01');
    // La columna C no es un día, así que su fórmula no se interpreta como turno.
    expect(mes?.entries).toHaveLength(2);
  });

  // El otro caso real: Septiembre acaba con una columna `Libres por periodo`.
  it('ignora una columna final que no es una fecha, y lo avisa', () => {
    const libro = construirLibro([{
      nombre: 'Septiembre',
      filas: [
        ['', '', 'martes', 'miércoles', 'Libres por periodo'],
        ['', '', serial('2026-09-01'), serial('2026-09-02'), 'Libres por periodo'],
        ['MEGA N1', 'ROSALES ANA', '06:00-15:00', 'Libre', 8],
      ],
    }]);
    const r = parseWorkbook(libro);

    expect(r.months[0]?.dates).toEqual(['2026-09-01', '2026-09-02']);
    const aviso = r.warnings.find((w) => w.code === 'columna-ignorada');
    expect(aviso?.message).toMatch(/Libres por periodo/);
    expect(aviso?.message).toMatch(/Columna E/);
  });

  it('la fila 1 se ignora aunque traiga texto de días', () => {
    const libro = construirLibro([mesSencillo()]);
    const mes = parseWorkbook(libro).months[0];
    expect(mes?.dates).not.toContain('domingo');
    expect(mes?.dates).toHaveLength(3);
  });
});

describe('personas y departamentos', () => {
  it('lee a todas las personas con su departamento, rol y sede', () => {
    const mes = parseWorkbook(construirLibro([mesSencillo()])).months[0];

    expect(mes?.people).toHaveLength(2);
    const ana = mes?.people.find((p) => p.displayName === 'Ana Lucia Martinez Rosales');
    expect(ana).toMatchObject({ department: 'MEGA N1', role: 'N1', site: 'Megacentro' });
    const sofia = mes?.people.find((p) => p.displayName === 'Sofia Elena Cruz de Molina');
    expect(sofia).toMatchObject({ department: 'SUP MEGA', role: 'Supervisor', site: 'Megacentro' });
  });

  it('ignora sin avisar las filas sin nombre: son separadores y totales', () => {
    const libro = construirLibro([{
      nombre: 'Noviembre',
      filas: [
        ['', '', 'domingo'],
        ['', '', serial('2026-11-01')],
        ['MEGA N1', 'ROSALES ANA', '06:00-15:00'],
        ['', '', ''],
        ['TOTAL', null, 20],
        ['MEGA N2', 'MOLINA SOFIA', 'Libre'],
      ],
    }]);
    const mes = parseWorkbook(libro).months[0];

    expect(mes?.people).toHaveLength(2);
    expect(mes?.entries).toHaveLength(2);
  });

  it('guarda la fila de la hoja para poder señalarla en un aviso', () => {
    const mes = parseWorkbook(construirLibro([mesSencillo()])).months[0];
    expect(mes?.people[0]?.row).toBe(3);
    expect(mes?.people[1]?.row).toBe(4);
  });

  it('detecta dos filas con la misma persona', () => {
    const libro = construirLibro([{
      nombre: 'Noviembre',
      filas: [
        ['', '', 'domingo'],
        ['', '', serial('2026-11-01')],
        ['MEGA N1', 'ROSALES ANA LUCIA', '06:00-15:00'],
        ['CC N1', 'Ana Lucia Rosales', '14:00-23:00'],
      ],
    }]);
    const r = parseWorkbook(libro);
    const aviso = r.warnings.find((w) => w.code === 'persona-duplicada');

    expect(aviso).toBeDefined();
    expect(aviso?.message).toMatch(/filas 3 y 4/);
  });

  it('un departamento desconocido deja a su gente sin sede y con rol Otro', () => {
    const libro = construirLibro([{
      nombre: 'Noviembre',
      filas: [
        ['', '', 'domingo'],
        ['', '', serial('2026-11-01')],
        ['EQUIPO INVENTADO', 'ROSALES ANA', '06:00-15:00'],
      ],
    }]);
    const mes = parseWorkbook(libro).months[0];

    expect(mes?.people[0]).toMatchObject({ role: 'Otro', site: 'Sin sede' });
  });
});

describe('los días de cada persona', () => {
  it('cada persona tiene una entrada por día del mes', () => {
    const mes = parseWorkbook(construirLibro([mesSencillo()])).months[0];
    expect(mes?.entries).toHaveLength(2 * 3);
  });

  it('interpreta turnos, libres y vacaciones', () => {
    const libro = construirLibro([{
      nombre: 'Noviembre',
      filas: [
        ['', '', 'd', 'l', 'm', 'x'],
        ['', '', serial('2026-11-01'), serial('2026-11-02'), serial('2026-11-03'), serial('2026-11-04')],
        ['MEGA N1', 'ROSALES ANA', '21:00-06:00', '15:00-00:00', 'VACACIONES', ''],
      ],
    }]);
    const mes = parseWorkbook(libro).months[0];
    const porFecha = indexarEntradas(mes?.entries ?? []).get('ANA ROSALES');

    expect(porFecha?.get('2026-11-01')?.shift).toMatchObject({ kind: 'work', endMin: 1800 });
    expect(porFecha?.get('2026-11-02')?.shift).toMatchObject({ kind: 'work', endMin: 1440 });
    expect(porFecha?.get('2026-11-03')?.shift.kind).toBe('vacation');
    expect(porFecha?.get('2026-11-04')?.shift.kind).toBe('unknown');
  });

  it('indexarEntradas permite buscar por persona y fecha', () => {
    const mes = parseWorkbook(construirLibro([mesSencillo()])).months[0];
    const indice = indexarEntradas(mes?.entries ?? []);

    expect(indice.size).toBe(2);
    expect(indice.get('ANA LUCIA MARTINEZ ROSALES')?.size).toBe(3);
    expect(indice.get('no existe')).toBeUndefined();
  });
});

describe('resumirMes', () => {
  it('cuenta lo que se muestra en el resumen de lectura', () => {
    const libro = construirLibro([{
      nombre: 'Noviembre',
      filas: [
        ['', '', 'd', 'l', 'm'],
        ['', '', serial('2026-11-01'), serial('2026-11-02'), serial('2026-11-03')],
        ['MEGA N1', 'ROSALES ANA', '06:00-15:00', 'Libre', 'Vacaciones'],
        ['CC N1', 'MOLINA SOFIA', '06:00-15:00', '06:00-15:00', ''],
      ],
    }]);
    const mes = parseWorkbook(libro).months[0];
    expect(mes).toBeDefined();

    expect(resumirMes(mes!)).toMatchObject({
      personas: 2,
      departamentos: 2,
      sedes: 2,
      dias: 3,
      turnos: 3,
      libres: 1,
      vacaciones: 1,
      sinDato: 1,
    });
  });
});

describe('letraColumna', () => {
  it('traduce el índice a la letra de Excel', () => {
    expect(letraColumna(0)).toBe('A');
    expect(letraColumna(2)).toBe('C');
    expect(letraColumna(25)).toBe('Z');
    expect(letraColumna(26)).toBe('AA');
    expect(letraColumna(33)).toBe('AH'); // la columna de `Libres por periodo`
  });
});

describe('varios meses en un libro', () => {
  it('lee cada pestaña como su propio mes', () => {
    const libro = construirLibro([
      {
        nombre: 'Octubre',
        filas: [
          ['', '', 'j'],
          ['', '', ...serialesDelMes(2026, 10, 1)],
          ['MEGA N1', 'ROSALES ANA', '06:00-15:00'],
        ],
      },
      mesSencillo('Noviembre'),
    ]);
    const r = parseWorkbook(libro);

    expect(r.months.map((m) => m.month)).toEqual(['2026-10-01', '2026-11-01']);
  });
});
