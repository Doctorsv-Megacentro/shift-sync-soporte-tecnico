/**
 * Pares de turnos en días seguidos y el descanso que queda entre ellos. Lo
 * comparten `descanso-corto` y `descanso-justo`. Ficha: docs/features/panel.md.
 */

import { MINUTOS_POR_DIA } from '../config.ts';
import { addDays, formatMinutes } from '../time.ts';
import type { DateKey, SheetPerson } from '../types.ts';
import type { Contexto, ContextoMes } from './contexto.ts';

export interface ParDescanso {
  readonly person: SheetPerson;
  readonly department: string;
  readonly desde: DateKey;
  readonly hasta: DateKey;
  readonly minutos: number;
  readonly finAnterior: number;
  readonly inicioSiguiente: number;
}

export function paresDeDescanso(ctx: Contexto): ParDescanso[] {
  const salida: ParDescanso[] = [];
  for (const mes of ctx.meses) salida.push(...paresDelMes(mes));
  return salida;
}

function paresDelMes(mes: ContextoMes): ParDescanso[] {
  const salida: ParDescanso[] = [];
  for (const person of mes.personas.values()) {
    const dias = mes.efectivo.porPersona.get(person.key);
    if (dias === undefined) continue;
    for (const fecha of mes.mes.dates) {
      const hoy = dias.get(fecha);
      const manana = dias.get(addDays(fecha, 1));
      if (hoy === undefined || manana === undefined) continue;
      if (hoy.shift.kind !== 'work' || manana.shift.kind !== 'work') continue;
      const minutos = manana.shift.startMin + MINUTOS_POR_DIA - hoy.shift.endMin;
      salida.push({
        person,
        department: hoy.department,
        desde: fecha,
        hasta: manana.date,
        minutos,
        finAnterior: hoy.shift.endMin,
        inicioSiguiente: manana.shift.startMin,
      });
    }
  }
  return salida;
}

export function textoDescanso(par: ParDescanso): string {
  return `${par.person.displayName} (${par.department}) cierra a las ${formatMinutes(par.finAnterior)} y abre a las ${formatMinutes(par.inicioSiguiente)} del día siguiente.`;
}
