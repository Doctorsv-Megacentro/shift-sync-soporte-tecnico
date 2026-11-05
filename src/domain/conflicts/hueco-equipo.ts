/**
 * Regla `hueco-equipo`: un departamento N1 o N2 se queda sin nadie al menos
 * `HUECO_MIN` dentro de la unión de sus turnos del mes. Ficha: docs/features/panel.md.
 */

import { resolveDepartment } from '../catalog.ts';
import { HUECO_MIN } from '../config.ts';
import { addDays } from '../time.ts';
import type { DateKey, ScheduleEntry } from '../types.ts';
import { armar } from './base.ts';
import { claveIntervalo, etiquetaDia, rangoHorario, slug } from './clave.ts';
import { mesDe, type Contexto, type ContextoMes } from './contexto.ts';
import { proyeccion, restar, tramoDelDia, unir, type Tramo } from './intervalos.ts';
import type { Conflicto } from './types.ts';

const REGLA = 'hueco-equipo';

function coberturaDelDia(mes: ContextoMes, ctx: Contexto, department: string, fecha: DateKey): Tramo[] {
  const tramos: Tramo[] = [];
  for (const entry of mes.efectivo.porFecha.get(fecha) ?? []) {
    if (entry.department !== department) continue;
    const tramo = tramoDelDia(entry.shift, 'hoy');
    if (tramo !== null) tramos.push(tramo);
  }
  const ayerFecha = addDays(fecha, -1);
  const ayer = mesDe(ctx, ayerFecha);
  for (const entry of ayer?.efectivo.porFecha.get(ayerFecha) ?? []) {
    if (entry.department !== department) continue;
    const tramo = tramoDelDia(entry.shift, 'ayer');
    if (tramo !== null) tramos.push(tramo);
  }
  return tramos;
}

function entradasEfectivas(mes: ContextoMes): ScheduleEntry[] {
  const salida: ScheduleEntry[] = [];
  for (const entry of mes.mes.entries) {
    const efectiva = mes.efectivo.porPersona.get(entry.personKey)?.get(entry.date);
    salida.push(efectiva ?? entry);
  }
  return salida;
}

export function huecoEquipo(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];

  for (const mes of ctx.meses) {
    const habitual = new Map<string, Tramo[]>();
    for (const entry of entradasEfectivas(mes)) {
      const info = resolveDepartment(entry.department);
      if (info.role !== 'N1' && info.role !== 'N2') continue;
      const lista = habitual.get(entry.department) ?? [];
      lista.push(...proyeccion(entry.shift));
      habitual.set(entry.department, lista);
    }

    for (const [department, tramos] of habitual) {
      const ventana = unir(tramos);
      if (ventana.length === 0) continue;
      const info = resolveDepartment(department);
      const alcance = slug(department);

      for (const fecha of mes.mes.dates) {
        const cobertura = unir(coberturaDelDia(mes, ctx, department, fecha));
        for (const hueco of restar(ventana, cobertura)) {
          if (hueco.end - hueco.start < HUECO_MIN) continue;
          salida.push(
            armar({
              regla: REGLA,
              key: claveIntervalo(REGLA, alcance, fecha, hueco.start, hueco.end),
              grupo: `${REGLA}:${alcance}`,
              severidad: 'media',
              tipo: 'Cobertura',
              titulo: `${department} sin ${info.role}`,
              resumen: `${etiquetaDia(fecha)} · ${rangoHorario(hueco.start, hueco.end)}`,
              detalle: `${department} se queda sin ${info.role} el ${etiquetaDia(fecha)} de ${rangoHorario(hueco.start, hueco.end)}, dentro del horario en el que ese equipo suele trabajar.`,
              fecha,
              enlace: true,
            }),
          );
        }
      }
    }
  }

  return salida;
}
