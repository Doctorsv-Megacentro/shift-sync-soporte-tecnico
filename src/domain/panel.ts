/**
 * Métricas y cobertura de un día para el panel de jefatura: franjas, sedes y
 * departamentos. «En turno» cuenta los turnos que empiezan ese día. Ficha:
 * docs/features/panel.md.
 */

import { SEDES } from './catalog.ts';
import type { IndiceMes } from './presence.ts';
import { shiftBand } from './shift.ts';
import { compararNombres } from './text.ts';
import type { Band, DateKey, Role, Site } from './types.ts';

export interface FranjaDia {
  readonly banda: Band;
  readonly cantidad: number;
}

export interface SedeDia {
  readonly site: Site;
  readonly enTurno: number;
  readonly total: number;
}

export interface DepartamentoDia {
  readonly department: string;
  readonly role: Role;
  readonly site: Site;
  readonly enTurno: number;
  readonly libres: number;
  readonly vacaciones: number;
  readonly total: number;
}

const FRANJAS: readonly Band[] = ['Mañana', 'Día', 'Tarde', 'Noche'];

/** Cuántos turnos que empiezan ese día caen en cada franja. */
export function franjasDelDia(indice: IndiceMes, fecha: DateKey): FranjaDia[] {
  const cuenta = new Map<Band, number>(FRANJAS.map((banda) => [banda, 0]));
  for (const entry of indice.porFecha.get(fecha) ?? []) {
    const banda = shiftBand(entry.shift);
    if (banda === null) continue;
    cuenta.set(banda, (cuenta.get(banda) ?? 0) + 1);
  }
  return FRANJAS.map((banda) => ({ banda, cantidad: cuenta.get(banda) ?? 0 }));
}

/** En turno / total por sede, en el orden del catálogo. */
export function sedesDelDia(indice: IndiceMes, fecha: DateKey): SedeDia[] {
  return SEDES.map((site) => {
    let total = 0;
    let enTurno = 0;
    for (const person of indice.personas.values()) {
      if (person.site !== site) continue;
      total += 1;
      const entry = indice.porPersona.get(person.key)?.get(fecha);
      if (entry?.shift.kind === 'work') enTurno += 1;
    }
    return { site, enTurno, total };
  });
}

/** Departamentos de mayor a menor, y a igualdad de tamaño por nombre. */
export function departamentosDelDia(indice: IndiceMes, fecha: DateKey): DepartamentoDia[] {
  const grupos = new Map<string, DepartamentoDia>();
  for (const person of indice.personas.values()) {
    const actual = grupos.get(person.department) ?? {
      department: person.department,
      role: person.role,
      site: person.site,
      enTurno: 0,
      libres: 0,
      vacaciones: 0,
      total: 0,
    };
    const entry = indice.porPersona.get(person.key)?.get(fecha);
    const siguiente: DepartamentoDia = {
      ...actual,
      total: actual.total + 1,
      enTurno: actual.enTurno + (entry?.shift.kind === 'work' ? 1 : 0),
      libres: actual.libres + (entry?.shift.kind === 'off' ? 1 : 0),
      vacaciones: actual.vacaciones + (entry?.shift.kind === 'vacation' ? 1 : 0),
    };
    grupos.set(person.department, siguiente);
  }
  return [...grupos.values()].sort(
    (a, b) => b.total - a.total || compararNombres(a.department, b.department),
  );
}
