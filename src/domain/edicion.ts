/**
 * Lo que necesita el panel «Cambiar un día»: los horarios más frecuentes de
 * un departamento ese mes, avisos de descanso (no bloquean) y quién
 * coincide o puede dar apoyo con el nuevo horario. Plan §7.5. Los umbrales
 * de descanso son los «Propuestos» del bloqueo §2 (docs/progreso.md): no
 * están confirmados por Ado, pero son los que el propio plan usa para esta
 * pantalla (a diferencia de las reglas de conflicto de la Fase 6, que
 * dependen del mismo bloqueo y por eso siguen sin construirse). Ficha:
 * docs/features/horario.md.
 */

import type { DayOverride } from './overlay.ts';
import { buscarOverride } from './overlay.ts';
import type { IndiceMes } from './presence.ts';
import { diaDe } from './presence.ts';
import { seSolapan } from './shift.ts';
import { compararNombres } from './text.ts';
import { formatDuration, formatMinutes } from './time.ts';
import type { DateKey, ScheduleEntry, SheetPerson, ShiftValue } from './types.ts';

/** Descanso mínimo entre dos turnos antes de avisar (Propuesto, bloqueo §2). */
export const DESCANSO_MINIMO_MIN = 8 * 60;
/** Duración de turno a partir de la cual se avisa (Propuesto, bloqueo §2). */
export const TURNO_MAXIMO_MIN = 12 * 60;

function textoTurno(shift: ShiftValue): string | null {
  return shift.kind === 'work' ? `${formatMinutes(shift.startMin)}-${formatMinutes(shift.endMin % 1440)}` : null;
}

/**
 * Los `cantidad` turnos más frecuentes de un departamento, en las entradas
 * de un mes (plan §7.5: «horarios rápidos»). Empate: orden alfabético.
 */
export function turnosFrecuentes(
  entries: readonly ScheduleEntry[],
  department: string,
  cantidad = 6,
): string[] {
  const conteo = new Map<string, number>();
  for (const e of entries) {
    if (e.department !== department) continue;
    const texto = textoTurno(e.shift);
    if (texto === null) continue;
    conteo.set(texto, (conteo.get(texto) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .sort(([textoA, na], [textoB, nb]) => nb - na || textoA.localeCompare(textoB))
    .slice(0, cantidad)
    .map(([texto]) => texto);
}

/**
 * Avisos de descanso para un turno nuevo: menos del mínimo con el turno de
 * ayer o el de mañana, o una duración mayor al máximo. Nunca bloquea
 * guardar, solo avisa (plan §7.5).
 */
export function avisosDescanso(
  ayer: ShiftValue | null,
  manana: ShiftValue | null,
  nuevo: Extract<ShiftValue, { kind: 'work' }>,
): string[] {
  const avisos: string[] = [];

  if (ayer !== null && ayer.kind === 'work') {
    const descanso = 1440 + nuevo.startMin - ayer.endMin;
    if (descanso < DESCANSO_MINIMO_MIN) {
      avisos.push(
        `Solo ${formatDuration(descanso)} de descanso desde el turno del día anterior (${formatMinutes(ayer.startMin)}–${formatMinutes(ayer.endMin % 1440)}).`,
      );
    }
  }

  if (manana !== null && manana.kind === 'work') {
    const descanso = 1440 + manana.startMin - nuevo.endMin;
    if (descanso < DESCANSO_MINIMO_MIN) {
      avisos.push(
        `Solo ${formatDuration(descanso)} de descanso antes del turno del día siguiente (${formatMinutes(manana.startMin)}–${formatMinutes(manana.endMin % 1440)}).`,
      );
    }
  }

  if (nuevo.endMin - nuevo.startMin > TURNO_MAXIMO_MIN) {
    avisos.push('El turno dura más de 12 horas.');
  }

  return avisos;
}

export interface CompaneriaDelDia {
  /** Quién tiene exactamente ese horario, en esa sede, ese día. */
  readonly coincidentes: readonly SheetPerson[];
  /** Hasta `limite` personas de esa sede cuyo turno se solapa, para apoyo. */
  readonly apoyos: readonly SheetPerson[];
}

/**
 * Compañeros con el nuevo horario y candidatos a apoyo (plan §7.5). La sede
 * de cada persona ese día es la de un cambio de jefatura vigente si lo hay,
 * si no la habitual (igual que `domain/overlay.ts` para el turno).
 */
export function companerosYApoyo(
  indice: IndiceMes,
  indiceOverrides: ReadonlyMap<string, DayOverride>,
  date: DateKey,
  nuevo: Extract<ShiftValue, { kind: 'work' }>,
  site: string,
  personaKey: string,
  limiteApoyo = 8,
): CompaneriaDelDia {
  const coincidentes: SheetPerson[] = [];
  const apoyos: SheetPerson[] = [];

  for (const [key, persona] of indice.personas) {
    if (key === personaKey) continue;
    const sedeDeHoy = buscarOverride(indiceOverrides, key, date)?.site ?? persona.site;
    if (sedeDeHoy !== site) continue;

    const entry = diaDe(indice, key, date);
    if (entry === null || entry.shift.kind !== 'work') continue;

    if (entry.shift.startMin === nuevo.startMin && entry.shift.endMin === nuevo.endMin) {
      coincidentes.push(persona);
    } else if (seSolapan(entry.shift, nuevo)) {
      apoyos.push(persona);
    }
  }

  coincidentes.sort((a, b) => compararNombres(a.displayName, b.displayName));
  apoyos.sort((a, b) => compararNombres(a.displayName, b.displayName));
  return { coincidentes, apoyos: apoyos.slice(0, limiteApoyo) };
}
