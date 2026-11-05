import { describe, expect, it } from 'vitest';
import {
  agruparPorEntrada,
  buscarPersonas,
  combinarMeses,
  contarPorHorario,
  diaDe,
  indexarMes,
  metricasDelDia,
  quienEsta,
  resumirSemana,
} from '../../src/domain/presence.ts';
import { parseWorkbook } from '../../src/domain/workbook.ts';
import { construirLibro, serial } from '../fixtures/construir.ts';
import type { ParsedMonth } from '../../src/domain/types.ts';

// Todos los nombres de estas pruebas son ficticios (ADR-0011).

const DIAS = ['2026-11-02', '2026-11-03', '2026-11-04'] as const;

/**
 * Un lunes 2 de noviembre con una plantilla pensada para cubrir los casos:
 * dos personas del mismo departamento con el mismo horario, una del mismo
 * departamento con otro horario, una de otra sede con el mismo horario, una
 * libre y una de vacaciones.
 */
function plantilla(): ParsedMonth {
  const libro = construirLibro([{
    nombre: 'Noviembre',
    filas: [
      ['', '', 'lunes', 'martes', 'miércoles'],
      ['', '', serial(DIAS[0]), serial(DIAS[1]), serial(DIAS[2])],
      ['MEGA N1', 'ROSALES ANA LUCIA', '06:00-15:00', '06:00-15:00', 'Libre'],
      ['MEGA N1', 'MOLINA SOFIA ELENA', '06:00-15:00', 'Libre', '06:00-15:00'],
      ['MEGA N1', 'RAMOS CARLOS', '14:00-23:00', '14:00-23:00', '14:00-23:00'],
      ['CC N1', 'ALVAREZ PEDRO', '06:00-15:00', '06:00-15:00', '06:00-15:00'],
      ['CC N2', 'ZAMORA BEATRIZ', 'Libre', 'Libre', 'Libre'],
      ['QA', 'GOMEZ JOSE ANTONIO', 'Vacaciones', 'Vacaciones', 'Vacaciones'],
      ['SUP MEGA', 'FUENTES DE LEON NURIA', '21:00-06:00', '21:00-06:00', 'Libre'],
    ],
  }]);
  const mes = parseWorkbook(libro).months[0];
  if (mes === undefined) throw new Error('El fixture no produjo un mes');
  return mes;
}

const mes = plantilla();
const indice = indexarMes(mes);
const ANA = 'ANA LUCIA ROSALES';
const BEATRIZ = 'BEATRIZ ZAMORA';

describe('indexarMes y diaDe', () => {
  it('indexa a todas las personas y todos los días', () => {
    expect(indice.personas.size).toBe(7);
    expect(indice.porFecha.get(DIAS[0])).toHaveLength(7);
    expect(indice.porPersona.get(ANA)?.size).toBe(3);
  });

  it('diaDe devuelve el día pedido', () => {
    expect(diaDe(indice, ANA, DIAS[0])?.shift).toMatchObject({ kind: 'work', startMin: 360 });
    expect(diaDe(indice, ANA, DIAS[2])?.shift.kind).toBe('off');
  });

  it('diaDe devuelve null para una persona o fecha que no existen', () => {
    expect(diaDe(indice, 'NO EXISTE', DIAS[0])).toBeNull();
    expect(diaDe(indice, ANA, '2026-12-25')).toBeNull();
  });
});

describe('quienEsta: mismo horario', () => {
  it('lista solo a quien tiene exactamente la misma entrada y salida', () => {
    const r = quienEsta(indice, DIAS[0], 'mismo-horario', ANA);
    // Sofía (mismo depto) y Pedro (otra sede) comparten 06:00-15:00. Carlos no.
    expect(r.map((p) => p.person.displayName)).toEqual([
      'Pedro Alvarez',
      'Sofia Elena Molina',
    ]);
  });

  it('no se incluye a sí misma', () => {
    const r = quienEsta(indice, DIAS[0], 'mismo-horario', ANA);
    expect(r.map((p) => p.person.key)).not.toContain(ANA);
  });

  // Criterio del plan §7.1: el segmento se deshabilita en día libre.
  it('va vacía si el día de la persona es libre', () => {
    expect(quienEsta(indice, DIAS[0], 'mismo-horario', BEATRIZ)).toEqual([]);
  });

  it('va vacía si el día es de vacaciones', () => {
    expect(quienEsta(indice, DIAS[0], 'mismo-horario', 'ANTONIO GOMEZ JOSE')).toEqual([]);
  });

  it('va vacía si no se sabe de quién se habla', () => {
    expect(quienEsta(indice, DIAS[0], 'mismo-horario', null)).toEqual([]);
  });
});

describe('quienEsta: mi equipo', () => {
  it('lista a quien trabaja en el mismo departamento ese día', () => {
    const r = quienEsta(indice, DIAS[0], 'mi-equipo', ANA);
    expect(r.map((p) => p.person.displayName)).toEqual([
      'Sofia Elena Molina',
      'Carlos Ramos',
    ]);
  });

  it('no incluye a quien está libre, aunque sea del equipo', () => {
    const r = quienEsta(indice, DIAS[1], 'mi-equipo', ANA);
    // Ese martes Sofía está libre; solo queda Carlos.
    expect(r.map((p) => p.person.displayName)).toEqual(['Carlos Ramos']);
  });
});

describe('quienEsta: toda la operación', () => {
  it('lista a todos los que trabajan, de cualquier sede', () => {
    const r = quienEsta(indice, DIAS[0], 'toda-la-operacion', ANA);
    // De 7 personas: Ana se excluye, Beatriz libre y José de vacaciones.
    expect(r).toHaveLength(4);
  });

  it('ordena por hora de entrada y, a igual hora, por nombre', () => {
    const r = quienEsta(indice, DIAS[0], 'toda-la-operacion', ANA);
    expect(r.map((p) => p.person.displayName)).toEqual([
      'Pedro Alvarez',        // 06:00
      'Sofia Elena Molina',   // 06:00
      'Carlos Ramos',         // 14:00
      'Nuria Fuentes de Leon',   // 21:00
    ]);
  });

  it('sin persona de referencia, lista a todos los que trabajan', () => {
    expect(quienEsta(indice, DIAS[0], 'toda-la-operacion', null)).toHaveLength(5);
  });
});

describe('agruparPorEntrada', () => {
  it('agrupa en «Entran HH:MM» y ordena por hora', () => {
    const grupos = agruparPorEntrada(quienEsta(indice, DIAS[0], 'toda-la-operacion', ANA));

    expect(grupos.map((g) => g.hora)).toEqual(['06:00', '14:00', '21:00']);
    expect(grupos[0]?.personas).toHaveLength(2);
    expect(grupos[1]?.personas).toHaveLength(1);
  });

  it('una lista vacía no produce grupos', () => {
    expect(agruparPorEntrada([])).toEqual([]);
  });
});

describe('buscarPersonas', () => {
  // Criterio del plan: «jose» encuentra «José», sin tildes ni mayúsculas.
  it('busca por cualquier parte del nombre, ignorando tildes y mayúsculas', () => {
    expect(buscarPersonas(mes, 'jose').map((p) => p.displayName)).toEqual(['Jose Antonio Gomez']);
    expect(buscarPersonas(mes, 'ROSALES').map((p) => p.displayName)).toEqual(['Ana Lucia Rosales']);
    expect(buscarPersonas(mes, 'lucia').map((p) => p.displayName)).toEqual(['Ana Lucia Rosales']);
    expect(buscarPersonas(mes, 'de leon').map((p) => p.displayName)).toEqual(['Nuria Fuentes de Leon']);
  });

  it('encuentra por un fragmento en medio de la palabra', () => {
    expect(buscarPersonas(mes, 'amor').map((p) => p.displayName)).toEqual(['Beatriz Zamora']);
  });

  it('respeta el límite de resultados', () => {
    expect(buscarPersonas(mes, 'a', 3)).toHaveLength(3);
  });

  it('una búsqueda vacía no devuelve nada', () => {
    expect(buscarPersonas(mes, '')).toEqual([]);
    expect(buscarPersonas(mes, '   ')).toEqual([]);
  });

  it('sin coincidencias, lista vacía', () => {
    expect(buscarPersonas(mes, 'zzzz')).toEqual([]);
  });

  it('ordena por nombre a mostrar', () => {
    const r = buscarPersonas(mes, 'a', 10).map((p) => p.displayName);
    expect(r).toEqual([...r].sort((x, y) => x.localeCompare(y, 'es')));
  });
});

describe('resumirSemana', () => {
  it('cuenta turnos y horas de la persona', () => {
    const r = resumirSemana(indice, ANA, DIAS);
    expect(r.turnos).toBe(2);
    expect(r.minutos).toBe(2 * 9 * 60);
  });

  it('un turno que cruza medianoche cuenta sus horas reales', () => {
    const r = resumirSemana(indice, 'FUENTES DE LEON NURIA'.split(' ').sort().join(' '), DIAS);
    expect(r.turnos).toBe(2);
    expect(r.minutos).toBe(2 * 9 * 60); // 21:00-06:00 son 9 h
  });

  it('quien está libre toda la semana no suma nada', () => {
    expect(resumirSemana(indice, BEATRIZ, DIAS)).toEqual({ turnos: 0, minutos: 0 });
  });

  it('las fechas fuera del mes se ignoran', () => {
    expect(resumirSemana(indice, ANA, ['2026-12-25'])).toEqual({ turnos: 0, minutos: 0 });
  });
});

describe('metricasDelDia', () => {
  it('cuenta en turno, libres, vacaciones y los que cruzan medianoche', () => {
    expect(metricasDelDia(indice, DIAS[0])).toEqual({
      enTurno: 5,
      total: 7,
      libres: 1,
      vacaciones: 1,
      cruzanMedianoche: 1, // solo Marta, 21:00-06:00
    });
  });

  it('un día que no está en el mes da todo a cero', () => {
    expect(metricasDelDia(indice, '2026-12-25')).toMatchObject({ enTurno: 0, libres: 0 });
  });
});

describe('combinarMeses', () => {
  function plantillaDiciembre(): ParsedMonth {
    const libro = construirLibro([{
      nombre: 'Diciembre',
      filas: [
        ['', '', 'martes'],
        ['', '', serial('2026-12-01')],
        // Misma persona que en noviembre (ANA): no debe duplicarse.
        ['MEGA N1', 'ROSALES ANA LUCIA', '06:00-15:00'],
        ['MEGA N1', 'TORRES LUIS', '06:00-15:00'],
      ],
    }]);
    const mes = parseWorkbook(libro).months[0];
    if (mes === undefined) throw new Error('El fixture no produjo un mes');
    return mes;
  }

  it('junta las fechas y entradas de todos los meses', () => {
    const combinado = combinarMeses([mes, plantillaDiciembre()]);
    expect(combinado.dates).toEqual([...mes.dates, '2026-12-01']);
    expect(combinado.entries).toHaveLength(mes.entries.length + 2);
  });

  it('no duplica una persona que aparece en más de un mes', () => {
    const combinado = combinarMeses([mes, plantillaDiciembre()]);
    const claves = combinado.people.map((p) => p.key);
    expect(claves.filter((k) => k === ANA)).toHaveLength(1);
    expect(claves).toContain('LUIS TORRES');
  });

  it('un solo mes se combina igual a sí mismo', () => {
    const combinado = combinarMeses([mes]);
    expect(combinado.dates).toEqual(mes.dates);
    expect(combinado.entries).toHaveLength(mes.entries.length);
  });
});

describe('contarPorHorario', () => {
  it('cuenta cuántas personas comparten cada horario', () => {
    const cuenta = contarPorHorario(indice, DIAS[0]);
    expect(cuenta.get('360-900')).toBe(3); // Ana, Sofía y Pedro
    expect(cuenta.get('840-1380')).toBe(1); // Carlos
  });

  it('libres y vacaciones no cuentan como horario', () => {
    const cuenta = contarPorHorario(indice, DIAS[0]);
    const total = [...cuenta.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(5);
  });
});
