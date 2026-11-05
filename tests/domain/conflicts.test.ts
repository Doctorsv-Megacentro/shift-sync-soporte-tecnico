/**
 * Pruebas de las 16 reglas: un caso que dispara y otro que no, más agrupar
 * y resolver una cobertura con un cambio. Nombres ficticios (ADR-0011).
 */

import { describe, expect, it } from 'vitest';
import { resolveDepartment } from '../../src/domain/catalog.ts';
import { detectarConflictos, listarConflictos } from '../../src/domain/conflicts/index.ts';
import type { DayOverride } from '../../src/domain/overlay.ts';
import { addDays } from '../../src/domain/time.ts';
import type { DateKey, ParsedMonth, ScheduleEntry, SheetPerson, ShiftValue } from '../../src/domain/types.ts';

function persona(
  key: string,
  department: string,
  extra?: { rawName?: string; displayName?: string; joinedOn?: DateKey | null; displayNameSource?: 'auto' | 'manual' },
): SheetPerson {
  const info = resolveDepartment(department);
  return {
    key,
    rawName: extra?.rawName ?? key,
    displayName: extra?.displayName ?? key,
    department,
    role: info.role,
    site: info.site,
    area: info.area,
    joinedOn: extra?.joinedOn ?? null,
    needsReview: false,
    ...(extra?.displayNameSource !== undefined ? { displayNameSource: extra.displayNameSource } : {}),
    row: 3,
  };
}

function trabajo(inicio: number, fin: number): ShiftValue {
  return { kind: 'work', startMin: inicio, endMin: fin, raw: 'turno' };
}

function entrada(personKey: string, date: string, shift: ShiftValue, department: string): ScheduleEntry {
  return { personKey, date, department, shift };
}

function mes(people: SheetPerson[], entries: ScheduleEntry[], fechas: string[], month = '2026-11-01'): ParsedMonth {
  return { sheetName: 'Noviembre', hidden: false, month, dates: fechas, people, entries };
}

function cambio(parcial: Partial<DayOverride> & Pick<DayOverride, 'personKey' | 'date'>): DayOverride {
  return {
    kind: 'off',
    startMin: null,
    endMin: null,
    site: null,
    reason: 'Permiso',
    note: null,
    supportPersonKey: null,
    conflictKey: null,
    createdAt: '2026-11-01',
    ...parcial,
  };
}

const DIA = '2026-11-02';
const DIAS = [DIA, addDays(DIA, 1)];

describe('cobertura-supervision', () => {
  const n1 = persona('ANA N1', 'CC N1', { displayName: 'Ana N1' });
  const sup = persona('SOFIA SUP', 'SUP CC', { displayName: 'Sofia Sup' });

  it('avisa si hay N1 en turno y ningún supervisor de la sede', () => {
    const libro = mes(
      [n1, sup],
      [
        entrada(n1.key, DIA, trabajo(14 * 60, 18 * 60), n1.department),
        entrada(sup.key, DIA, { kind: 'off', raw: 'Libre' }, sup.department),
      ],
      [DIA],
    );
    const hallados = detectarConflictos([libro], []);
    const cobertura = hallados.filter((c) => c.regla === 'cobertura-supervision');
    expect(cobertura.map((c) => c.key)).toContain('cobertura-supervision:tuscania:2026-11-02:14:00-18:00');
    expect(cobertura[0]?.opciones.map((o) => o.id)).toContain(sup.key);
    expect(cobertura[0]?.etiquetaAccion).toBe('Asignar cobertura');
  });

  it('exige elegir una opción aunque no haya nadie disponible', () => {
    const libro = mes(
      [n1],
      [entrada(n1.key, DIA, trabajo(14 * 60, 18 * 60), n1.department)],
      [DIA],
    );
    const cobertura = detectarConflictos([libro], []).find((c) => c.regla === 'cobertura-supervision');
    expect(cobertura?.opciones).toEqual([]);
    expect(cobertura?.exigeOpcion).toBe(true);
  });

  it('no avisa si el supervisor de la sede está en ese horario', () => {
    const libro = mes(
      [n1, sup],
      [
        entrada(n1.key, DIA, trabajo(14 * 60, 18 * 60), n1.department),
        entrada(sup.key, DIA, trabajo(14 * 60, 18 * 60), sup.department),
      ],
      [DIA],
    );
    expect(detectarConflictos([libro], []).some((c) => c.regla === 'cobertura-supervision')).toBe(false);
  });

  it('asignar cobertura cierra el hueco y el conflicto pasa a resueltos', () => {
    const libro = mes(
      [n1, sup],
      [
        entrada(n1.key, DIA, trabajo(14 * 60, 18 * 60), n1.department),
        entrada(sup.key, DIA, { kind: 'off', raw: 'Libre' }, sup.department),
      ],
      [DIA],
    );
    const key = 'cobertura-supervision:tuscania:2026-11-02:14:00-18:00';
    const override = cambio({
      personKey: sup.key,
      date: DIA,
      kind: 'work',
      startMin: 14 * 60,
      endMin: 18 * 60,
      site: 'Tuscania',
      reason: 'Apoyo a otra sede',
      conflictKey: key,
    });
    const listas = listarConflictos([libro], [override], []);
    expect(listas.pendientes.some((t) => t.claves.includes(key))).toBe(false);
    expect(listas.resueltos.some((t) => t.via === 'cambio' && t.claves.includes(key))).toBe(true);
  });
});

describe('descanso-corto y descanso-justo', () => {
  const personaSala = persona('ANA SALA', 'ATENCION GESTION SALAS', { displayName: 'Ana Sala' });

  function libroConDescanso(fin: number, inicioSiguiente: number): ParsedMonth {
    return mes(
      [personaSala],
      [
        entrada(personaSala.key, DIAS[0] ?? DIA, trabajo(15 * 60, fin), personaSala.department),
        entrada(personaSala.key, DIAS[1] ?? DIA, trabajo(inicioSiguiente, inicioSiguiente + 8 * 60), personaSala.department),
      ],
      DIAS,
    );
  }

  it('marca un descanso menor de 8 h y no uno de 10 h', () => {
    const corto = detectarConflictos([libroConDescanso(24 * 60, 6 * 60)], []);
    expect(corto.some((c) => c.regla === 'descanso-corto')).toBe(true);
    expect(corto.some((c) => c.regla === 'descanso-justo')).toBe(false);

    const holgado = detectarConflictos([libroConDescanso(22 * 60, 8 * 60)], []);
    expect(holgado.some((c) => c.regla === 'descanso-corto' || c.regla === 'descanso-justo')).toBe(false);
  });

  it('marca un descanso de entre 8 y 9 h como justo', () => {
    const justo = detectarConflictos([libroConDescanso(22 * 60, 6 * 60 + 30)], []);
    expect(justo.some((c) => c.regla === 'descanso-justo')).toBe(true);
    expect(justo.some((c) => c.regla === 'descanso-corto')).toBe(false);
    expect(justo.find((c) => c.regla === 'descanso-justo')?.etiquetaAccion).toBe('Aceptar regla de 8 h mínimo');
  });
});

describe('racha-larga', () => {
  const redes = persona('NELSON REDES', 'ESPECIALISTAS DE REDES', { displayName: 'Nelson Redes' });

  function racha(diasTrabajo: number): ParsedMonth {
    const fechas = Array.from({ length: 10 }, (_, i) => addDays('2026-11-05', i));
    const entries = fechas.map((fecha, i) =>
      entrada(
        redes.key,
        fecha,
        i < diasTrabajo ? trabajo(8 * 60, 17 * 60) : { kind: 'off', raw: 'Libre' },
        redes.department,
      ),
    );
    return mes([redes], entries, fechas);
  }

  it('avisa a partir de 7 días y no con 6', () => {
    expect(detectarConflictos([racha(6)], []).some((c) => c.regla === 'racha-larga')).toBe(false);
    const hallados = detectarConflictos([racha(9)], []).filter((c) => c.regla === 'racha-larga');
    expect(hallados).toHaveLength(1);
    expect(hallados[0]?.key).toContain('2026-11-05');
    expect(hallados[0]?.key).toContain('2026-11-13');
    expect(hallados[0]?.titulo).toContain('9 días');
  });
});

describe('sede-sin-supervision', () => {
  it('avisa Phoenix Tower si hay N1 y ningún supervisor', () => {
    const n1 = persona('PHOENIX UNO', 'PHOENIX N1');
    const libro = mes([n1], [entrada(n1.key, DIA, trabajo(8 * 60, 17 * 60), n1.department)], [DIA]);
    expect(detectarConflictos([libro], []).some((c) => c.key.startsWith('sede-sin-supervision:phoenix-tower'))).toBe(true);
  });

  it('no avisa una sede que sí tiene supervisor', () => {
    const n1 = persona('CC UNO', 'CC N1');
    const sup = persona('CC SUP', 'SUP CC');
    const libro = mes(
      [n1, sup],
      [entrada(n1.key, DIA, trabajo(8 * 60, 17 * 60), n1.department)],
      [DIA],
    );
    expect(detectarConflictos([libro], []).some((c) => c.regla === 'sede-sin-supervision' && c.key.includes('tuscania'))).toBe(false);
  });
});

describe('hueco-equipo', () => {
  it('avisa si el equipo N1 no cubre su ventana habitual y no si alguien está', () => {
    const a = persona('CC ANA', 'CC N1');
    const fechas = ['2026-11-18', '2026-11-19'];
    const conHueco = mes(
      [a],
      [
        entrada(a.key, fechas[0] ?? DIA, trabajo(6 * 60, 21 * 60), a.department),
        entrada(a.key, fechas[1] ?? DIA, { kind: 'off', raw: 'Libre' }, a.department),
      ],
      fechas,
    );
    const huecos = detectarConflictos([conHueco], []).filter((c) => c.regla === 'hueco-equipo');
    expect(huecos.some((c) => c.key.includes('cc-n1') && c.key.includes('2026-11-19') && c.key.includes('06:00-21:00'))).toBe(true);

    const cubierto = mes(
      [a],
      fechas.map((fecha) => entrada(a.key, fecha, trabajo(6 * 60, 21 * 60), a.department)),
      fechas,
    );
    expect(detectarConflictos([cubierto], []).some((c) => c.regla === 'hueco-equipo')).toBe(false);
  });
});

describe('reglas de formato y de cambios', () => {
  it('valor no reconocido y su negativo', () => {
    const p = persona('ANA', 'QA', { displayName: 'Ana' });
    const malo = mes([p], [entrada(p.key, DIA, { kind: 'unknown', raw: '??' }, p.department)], [DIA]);
    const bueno = mes([p], [entrada(p.key, DIA, { kind: 'off', raw: 'Libre' }, p.department)], [DIA]);
    expect(detectarConflictos([malo], []).some((c) => c.regla === 'valor-no-reconocido')).toBe(true);
    expect(detectarConflictos([bueno], []).some((c) => c.regla === 'valor-no-reconocido')).toBe(false);
  });

  it('persona duplicada y su negativo', () => {
    const a = persona('ANA MARIA', 'QA', { displayName: 'Ana' });
    const b = persona('ANA MARIA', 'QA', { displayName: 'Ana María', rawName: 'MARIA ANA' });
    const dup = mes([a, b], [], [DIA]);
    const uno = mes([a], [], [DIA]);
    expect(detectarConflictos([dup], []).some((c) => c.regla === 'persona-duplicada')).toBe(true);
    expect(detectarConflictos([uno], []).some((c) => c.regla === 'persona-duplicada')).toBe(false);
  });

  it('departamento desconocido, mal escrito y sus negativos', () => {
    const raro = persona('OTRO', 'MESA INVENTADA', { displayName: 'Otro' });
    const typo = persona('REDES', 'ADMINSITRADOR DE REDES', { displayName: 'Redes' });
    const bien = persona('QA UNO', 'QA', { displayName: 'Qa' });
    const hallados = detectarConflictos([mes([raro, typo, bien], [], [DIA])], []);
    expect(hallados.some((c) => c.regla === 'departamento-desconocido')).toBe(true);
    expect(hallados.some((c) => c.regla === 'departamento-mal-escrito' && c.resumen.includes('ADMINSITRADOR'))).toBe(true);
    expect(detectarConflictos([mes([bien], [], [DIA])], []).some((c) => c.regla.startsWith('departamento-'))).toBe(false);
  });

  it('fecha en el nombre, vacaciones en mayúsculas y nombre con coma', () => {
    const ingreso = persona('HUGO PEREZ', 'QA', { displayName: 'Hugo Perez', joinedOn: '2026-11-03', rawName: 'Hugo Perez (3/11)' });
    const coma = persona('KARLA PEREZ', 'SUPERVISOR TERCERIAS', { rawName: 'PEREZ, KARLA', displayName: 'Karla Perez' });
    const vacaciones = persona('MAURICIO', 'MEGA N1');
    const entries = [
      entrada(vacaciones.key, DIA, { kind: 'vacation', raw: 'Vacaciones' }, vacaciones.department),
      entrada(vacaciones.key, addDays(DIA, 1), { kind: 'vacation', raw: 'VACACIONES' }, vacaciones.department),
    ];
    const hallados = detectarConflictos([mes([ingreso, coma, vacaciones], entries, DIAS)], []);
    expect(hallados.some((c) => c.regla === 'fecha-en-nombre')).toBe(true);
    expect(hallados.some((c) => c.regla === 'vacaciones-mayusculas' && c.resumen.startsWith('1 '))).toBe(true);
    expect(hallados.some((c) => c.regla === 'nombre-con-coma')).toBe(true);
  });

  it('orden dudoso ofrece los dos chips y no insiste si el nombre ya es manual', () => {
    const dudoso = persona('ANA MARTINEZ', 'QA', { rawName: 'ANA MARTINEZ', displayName: 'Ana Martinez' });
    const hallados = detectarConflictos([mes([dudoso], [], [DIA])], []);
    const tarjeta = hallados.find((c) => c.regla === 'orden-nombre-dudoso');
    expect(tarjeta?.opciones.map((o) => o.etiqueta)).toEqual(['Nombre primero', 'Apellido primero']);

    const manual = persona('ANA MARTINEZ', 'QA', {
      rawName: 'ANA MARTINEZ',
      displayName: 'Ana Martinez',
      displayNameSource: 'manual',
    });
    expect(detectarConflictos([mes([manual], [], [DIA])], []).some((c) => c.regla === 'orden-nombre-dudoso')).toBe(false);
  });

  it('compara con el mes anterior y no avisa si no hubo movimientos', () => {
    const p = persona('ANA', 'QA', { displayName: 'Ana' });
    const octubre = { ...mes([p], [], ['2026-10-01']), sheetName: 'Octubre', month: '2026-10-01' };
    const noviembre = mes([p], [], [DIA]);
    expect(detectarConflictos([octubre, noviembre], []).some((c) => c.regla === 'cambios-vs-mes-anterior')).toBe(false);

    const nuevo = persona('LUIS NUEVO', 'QA', { displayName: 'Luis' });
    const conIngreso = mes([p, nuevo], [], [DIA]);
    expect(detectarConflictos([octubre, conIngreso], []).some((c) => c.regla === 'cambios-vs-mes-anterior' && c.titulo.includes('ingreso'))).toBe(true);
  });

  it('cambio huérfano y cambio que la hoja ya trae', () => {
    const p = persona('ANA', 'QA', { displayName: 'Ana' });
    const libro = mes([p], [entrada(p.key, DIA, { kind: 'off', raw: 'Libre' }, p.department)], [DIA]);
    const huerfano = cambio({ personKey: 'NADIE', date: '2026-11-09' });
    const ya = cambio({ personKey: p.key, date: DIA, kind: 'off' });
    const distinto = cambio({ personKey: p.key, date: DIA, kind: 'work', startMin: 8 * 60, endMin: 17 * 60 });
    const hallados = detectarConflictos([libro], [huerfano, ya]);
    expect(hallados.some((c) => c.regla === 'cambio-huerfano' && c.archivar?.personKey === 'NADIE')).toBe(true);
    expect(hallados.some((c) => c.regla === 'cambio-ya-en-hoja')).toBe(true);
    expect(detectarConflictos([libro], [distinto]).some((c) => c.regla === 'cambio-ya-en-hoja')).toBe(false);
  });

  it('aceptar como está mueve la tarjeta a resueltos', () => {
    const p = persona('ANA', 'QA', { displayName: 'Ana', joinedOn: '2026-11-03' });
    const libro = mes([p], [], [DIA]);
    const key = detectarConflictos([libro], []).find((c) => c.regla === 'fecha-en-nombre')?.key ?? '';
    const listas = listarConflictos([libro], [], [{ conflictKey: key, note: 'Es un ingreso' }]);
    expect(listas.pendientes.some((t) => t.claves.includes(key))).toBe(false);
    expect(listas.resueltos.some((t) => t.via === 'ack' && t.nota === 'Es un ingreso')).toBe(true);
  });
});
