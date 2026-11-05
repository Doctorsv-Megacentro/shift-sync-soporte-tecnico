/**
 * Regla `cobertura-supervision`: en Megacentro o Tuscania hay N1/N2 en turno
 * y nadie que cubra la supervisión, durante al menos `HUECO_MIN`. Ficha:
 * docs/features/panel.md.
 */

import { resolveDepartment } from '../catalog.ts';
import {
  HUECO_MIN,
  MINUTOS_POR_DIA,
  SEDES_CON_SUPERVISION,
  SUPERVISOR_EXCLUIDO_DE_COBERTURA,
} from '../config.ts';
import { normalize } from '../text.ts';
import { addDays, formatFechaLarga, formatMinutes } from '../time.ts';
import type { DateKey, Role, Site } from '../types.ts';
import { armar } from './base.ts';
import { claveIntervalo, etiquetaDia, rangoHorario, slug } from './clave.ts';
import { entradasDe, overrideDe, siteDelDia, type Contexto } from './contexto.ts';
import { restar, tramoDelDia, unir, type Tramo } from './intervalos.ts';
import type { Conflicto, OpcionConflicto } from './types.ts';

const REGLA = 'cobertura-supervision';
const DEPTO_EXCLUIDO = normalize(SUPERVISOR_EXCLUIDO_DE_COBERTURA);
const COORDINACION = 'COORDINADOR OPERACIONES';

function cubreSupervision(role: Role, department: string, siteDia: Site, sede: Site): boolean {
  if (siteDia !== sede) return false;
  if (normalize(department) === DEPTO_EXCLUIDO) return false;
  if (role === 'Supervisor') return true;
  return normalize(department) === COORDINACION;
}

function acumular(
  ctx: Contexto,
  fecha: DateKey,
  sede: Site,
  cual: 'hoy' | 'ayer',
  n1: Tramo[],
  sup: Tramo[],
): void {
  for (const entry of entradasDe(ctx, fecha)) {
    const tramo = tramoDelDia(entry.shift, cual);
    if (tramo === null) continue;
    const info = resolveDepartment(entry.department);
    const override = overrideDe(ctx, entry.personKey, entry.date);
    const siteDia = siteDelDia(info.site, override);
    if ((info.role === 'N1' || info.role === 'N2') && siteDia === sede) n1.push(tramo);
    if (cubreSupervision(info.role, entry.department, siteDia, sede)) sup.push(tramo);
  }
}

function libres(
  ctx: Contexto,
  fecha: DateKey,
  inicio: number,
  fin: number,
  sede: Site,
): OpcionConflicto[] {
  const mes = ctx.meses.find((m) => m.mes.dates.includes(fecha));
  if (mes === undefined) return [];
  const vistos = new Set<string>();
  const opciones: OpcionConflicto[] = [];

  for (const person of mes.personas.values()) {
    if (vistos.has(person.key)) continue;
    const entry = mes.efectivo.porPersona.get(person.key)?.get(fecha);
    if (entry === undefined || entry.shift.kind !== 'off') continue;
    const depto = normalize(person.department);
    const esSupervisor = person.role === 'Supervisor' && depto !== DEPTO_EXCLUIDO;
    const esCoordinacion = depto === COORDINACION;
    if (!esSupervisor && !esCoordinacion) continue;
    vistos.add(person.key);
    opciones.push({
      id: person.key,
      etiqueta: `${person.displayName} · ${person.department}`,
      asignacion: {
        personKey: person.key,
        date: fecha,
        startMin: inicio,
        endMin: fin,
        site: sede,
        reason: 'Apoyo a otra sede',
      },
      nombreManual: null,
    });
  }

  return opciones.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

function detalleDe(sede: Site, fecha: DateKey, inicio: number, fin: number, depto: string): string {
  return `El ${formatFechaLarga(fecha)} de ${formatMinutes(inicio)} a ${formatMinutes(fin === MINUTOS_POR_DIA ? 0 : fin)} nadie de ${depto} está en turno en ${sede}, y sí hay N1 o N2 de esa sede.`;
}

export function coberturaSupervision(ctx: Contexto): Conflicto[] {
  const salida: Conflicto[] = [];

  for (const [sede, depto] of SEDES_CON_SUPERVISION) {
    const fechas = new Set<DateKey>();
    for (const mes of ctx.meses) {
      for (const fecha of mes.mes.dates) fechas.add(fecha);
    }

    for (const fecha of [...fechas].sort()) {
      const n1: Tramo[] = [];
      const sup: Tramo[] = [];
      acumular(ctx, fecha, sede, 'hoy', n1, sup);
      acumular(ctx, addDays(fecha, -1), sede, 'ayer', n1, sup);

      const huecos = restar(unir(n1), unir(sup)).filter((h) => h.end - h.start >= HUECO_MIN);
      for (const hueco of huecos) {
        const alcance = slug(sede);
        const key = claveIntervalo(REGLA, alcance, fecha, hueco.start, hueco.end);
        const opciones = libres(ctx, fecha, hueco.start, hueco.end, sede);
        salida.push(
          armar({
            regla: REGLA,
            key,
            grupo: `${REGLA}:${alcance}`,
            severidad: 'alta',
            tipo: 'Cobertura',
            titulo: `${sede} sin supervisor`,
            resumen: `${etiquetaDia(fecha)} · ${rangoHorario(hueco.start, hueco.end)}`,
            detalle: detalleDe(sede, fecha, hueco.start, hueco.end, depto),
            fecha,
            opciones,
            // Sin alguien disponible, la acción debe seguir bloqueada: no
            // puede aparentar que asignó cobertura sin escribir un cambio.
            exigeOpcion: true,
            etiquetaAccion: 'Asignar cobertura',
            enlace: true,
          }),
        );
      }
    }
  }

  return salida;
}
