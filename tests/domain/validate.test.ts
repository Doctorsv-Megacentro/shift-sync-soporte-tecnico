import { describe, expect, it } from 'vitest';
import { contarPorSeveridad, validateMonth } from '../../src/domain/validate.ts';
import { parseWorkbook } from '../../src/domain/workbook.ts';
import { construirLibro, serial } from '../fixtures/construir.ts';
import type { HojaSintetica } from '../fixtures/construir.ts';
import type { ParsedMonth, WarningCode } from '../../src/domain/types.ts';

// Todos los nombres de estas pruebas son ficticios (ADR-0011).

/** Construye un mes con los días indicados y devuelve lo leído. */
function mes(filas: readonly (readonly unknown[])[], dias = 3): ParsedMonth {
  const fechas = Array.from({ length: dias }, (_, i) =>
    serial(`2026-11-${String(i + 1).padStart(2, '0')}`),
  );
  const hoja: HojaSintetica = {
    nombre: 'Noviembre',
    filas: [['', '', ...fechas.map(() => 'dia')], ['', '', ...fechas], ...filas],
  };
  const leido = parseWorkbook(construirLibro([hoja])).months[0];
  if (leido === undefined) throw new Error('El fixture no produjo un mes');
  return leido;
}

const codigos = (m: ParsedMonth): WarningCode[] => validateMonth(m).map((w) => w.code);

describe('celdas que no se reconocen', () => {
  it('avisa de una celda sin valor entendible', () => {
    const avisos = validateMonth(mes([['MEGA N1', 'ROSALES ANA', '06:00-15:00', '', 'Libre']]));
    const aviso = avisos.find((w) => w.code === 'valor-no-reconocido');

    expect(aviso?.severity).toBe('media');
    expect(aviso?.message).toMatch(/Ana Rosales/);
    expect(aviso?.date).toBe('2026-11-02');
  });

  // Treinta celdas malas de la misma fila son un problema, no treinta avisos.
  it('agrupa por persona en lugar de inundar la lista', () => {
    const avisos = validateMonth(mes([['MEGA N1', 'ROSALES ANA', '', '', '']]));
    const deValor = avisos.filter((w) => w.code === 'valor-no-reconocido');

    expect(deValor).toHaveLength(1);
    expect(deValor[0]?.message).toMatch(/3 días/);
    expect(deValor[0]?.date).toBeUndefined();
  });

  it('no avisa si todas las celdas se entienden', () => {
    const m = mes([['MEGA N1', 'ROSALES ANA', '06:00-15:00', 'Libre', 'Vacaciones']]);
    expect(codigos(m)).not.toContain('valor-no-reconocido');
  });
});

describe('departamentos', () => {
  it('avisa de un departamento que no está en el catálogo', () => {
    const avisos = validateMonth(mes([['EQUIPO INVENTADO', 'ROSALES ANA', 'Libre', 'Libre', 'Libre']]));
    const aviso = avisos.find((w) => w.code === 'departamento-desconocido');

    expect(aviso?.severity).toBe('media');
    expect(aviso?.message).toMatch(/EQUIPO INVENTADO/);
    expect(aviso?.message).toMatch(/catálogo/);
  });

  it('avisa del departamento mal escrito y dice cómo debería ser', () => {
    const avisos = validateMonth(
      mes([['Adminsitrador de Redes', 'ROSALES ANA', 'Libre', 'Libre', 'Libre']]),
    );
    const aviso = avisos.find((w) => w.code === 'departamento-mal-escrito');

    expect(aviso?.severity).toBe('baja');
    expect(aviso?.message).toMatch(/ADMINISTRADOR DE REDES/);
  });

  it('un departamento mal escrito no se reporta además como desconocido', () => {
    const c = codigos(mes([['Adminsitrador de Redes', 'ROSALES ANA', 'Libre', 'Libre', 'Libre']]));
    expect(c).toContain('departamento-mal-escrito');
    expect(c).not.toContain('departamento-desconocido');
  });

  it('no avisa de los departamentos del catálogo', () => {
    const c = codigos(mes([
      ['MEGA N1', 'ROSALES ANA', 'Libre', 'Libre', 'Libre'],
      ['QA', 'MOLINA SOFIA', 'Libre', 'Libre', 'Libre'],
    ]));
    expect(c).not.toContain('departamento-desconocido');
    expect(c).not.toContain('departamento-mal-escrito');
  });
});

describe('formato de los nombres', () => {
  it('avisa de la fecha de ingreso en el nombre y la cuenta', () => {
    const avisos = validateMonth(mes([
      ['MEGA N1', 'Ana Rosales (3/11)', 'Libre', 'Libre', 'Libre'],
      ['MEGA N2', 'Sofia Molina (3/11)', 'Libre', 'Libre', 'Libre'],
    ]));
    const aviso = avisos.find((w) => w.code === 'fecha-en-nombre');

    expect(aviso?.severity).toBe('baja');
    expect(aviso?.message).toMatch(/2 personas/);
  });

  it('avisa del nombre con coma', () => {
    const avisos = validateMonth(mes([['MEGA N1', 'ROSALES, ANA LUCIA', 'Libre', 'Libre', 'Libre']]));
    const aviso = avisos.find((w) => w.code === 'nombre-con-coma');

    expect(aviso?.message).toMatch(/APELLIDOS, NOMBRES/);
  });

  it('avisa del orden dudoso con su conteo', () => {
    const avisos = validateMonth(mes([['MEGA N1', 'JUAN PABLO RAMOS RAMOS', 'Libre', 'Libre', 'Libre']]));
    const aviso = avisos.find((w) => w.code === 'orden-nombre-dudoso');

    expect(aviso?.message).toMatch(/Revisa el orden de 1 nombre/);
  });

  it('un nombre normal no genera avisos de formato', () => {
    const c = codigos(mes([['MEGA N1', 'ROSALES ANA LUCIA', 'Libre', 'Libre', 'Libre']]));
    expect(c).not.toContain('fecha-en-nombre');
    expect(c).not.toContain('nombre-con-coma');
    expect(c).not.toContain('orden-nombre-dudoso');
  });
});

describe('variantes de Vacaciones', () => {
  // La hoja real trae «Vacaciones» y «VACACIONES» en la misma pestaña.
  it('avisa cuando conviven dos formas de escribirlo', () => {
    const avisos = validateMonth(mes([
      ['MEGA N1', 'ROSALES ANA', 'Vacaciones', 'VACACIONES', 'Libre'],
    ]));
    const aviso = avisos.find((w) => w.code === 'vacaciones-mayusculas');

    expect(aviso?.severity).toBe('baja');
    expect(aviso?.message).toMatch(/2 formas/);
  });

  it('no avisa si solo hay una forma', () => {
    const c = codigos(mes([['MEGA N1', 'ROSALES ANA', 'Vacaciones', 'Vacaciones', 'Libre']]));
    expect(c).not.toContain('vacaciones-mayusculas');
  });
});

describe('contarPorSeveridad', () => {
  it('cuenta los avisos por severidad', () => {
    const avisos = validateMonth(mes([
      ['EQUIPO INVENTADO', 'JUAN PABLO RAMOS RAMOS', '', 'Libre', 'Libre'],
    ]));
    const cuenta = contarPorSeveridad(avisos);

    expect(cuenta.media).toBeGreaterThanOrEqual(2); // valor y departamento
    expect(cuenta.baja).toBeGreaterThanOrEqual(1); // orden del nombre
    expect(cuenta.alta).toBe(0);
  });

  it('sin avisos, todo a cero', () => {
    expect(contarPorSeveridad([])).toEqual({ alta: 0, media: 0, baja: 0 });
  });
});

describe('un mes limpio no genera ningún aviso', () => {
  it('es el caso de la hoja real: ni celdas vacías ni valores raros', () => {
    const m = mes([
      ['MEGA N1', 'ROSALES ANA LUCIA', '06:00-15:00', '06:00-15:00', 'Libre'],
      ['SUP MEGA', 'MOLINA SOFIA ELENA', '14:00-23:00', 'Libre', '14:00-23:00'],
    ]);
    expect(validateMonth(m)).toEqual([]);
  });
});
