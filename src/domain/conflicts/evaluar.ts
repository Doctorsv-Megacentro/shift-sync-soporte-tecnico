/**
 * Corre las 16 reglas, agrupa los casos repetidos y separa pendientes de
 * resueltos (ack o cambio que ya cerró la regla). ADR-0007. Ficha:
 * docs/features/panel.md.
 */

import type { DayOverride } from '../overlay.ts';
import type { ParsedMonth } from '../types.ts';
import { cambioHuerfano } from './cambio-huerfano.ts';
import { cambioYaEnHoja } from './cambio-ya-en-hoja.ts';
import { cambiosVsMesAnterior } from './cambios-vs-mes-anterior.ts';
import { coberturaSupervision } from './cobertura-supervision.ts';
import { preparar, type Contexto } from './contexto.ts';
import { departamentoDesconocido } from './departamento-desconocido.ts';
import { departamentoMalEscrito } from './departamento-mal-escrito.ts';
import { descansoCorto } from './descanso-corto.ts';
import { descansoJusto } from './descanso-justo.ts';
import { fechaEnNombre } from './fecha-en-nombre.ts';
import { huecoEquipo } from './hueco-equipo.ts';
import { nombreConComa } from './nombre-con-coma.ts';
import { ordenNombreDudoso } from './orden-nombre-dudoso.ts';
import { personaDuplicada } from './persona-duplicada.ts';
import { rachaLarga } from './racha-larga.ts';
import { sedeSinSupervision } from './sede-sin-supervision.ts';
import type { AckConflicto, Conflicto, Severidad, TarjetaConflicto, TipoConflicto } from './types.ts';
import { vacacionesMayusculas } from './vacaciones-mayusculas.ts';
import { valorNoReconocido } from './valor-no-reconocido.ts';

const ORDEN_SEVERIDAD: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };

export function detectarConflictos(months: readonly ParsedMonth[], overrides: readonly DayOverride[]): Conflicto[] {
  const ctx = preparar(months, overrides);
  return reglas(ctx);
}

function reglas(ctx: Contexto): Conflicto[] {
  return [
    ...coberturaSupervision(ctx),
    ...descansoCorto(ctx),
    ...descansoJusto(ctx),
    ...rachaLarga(ctx),
    ...sedeSinSupervision(ctx),
    ...huecoEquipo(ctx),
    ...valorNoReconocido(ctx),
    ...personaDuplicada(ctx),
    ...cambioHuerfano(ctx),
    ...departamentoDesconocido(ctx),
    ...fechaEnNombre(ctx),
    ...vacacionesMayusculas(ctx),
    ...nombreConComa(ctx),
    ...departamentoMalEscrito(ctx),
    ...ordenNombreDudoso(ctx),
    ...cambiosVsMesAnterior(ctx),
    ...cambioYaEnHoja(ctx),
  ];
}

function porFecha(a: Conflicto, b: Conflicto): number {
  return (a.fecha ?? '').localeCompare(b.fecha ?? '') || a.key.localeCompare(b.key);
}

function resumenAgrupado(items: readonly Conflicto[]): string {
  const primero = items[0];
  if (primero === undefined) return '';
  const dias = new Set(items.map((item) => item.fecha).filter((fecha) => fecha !== null));
  const extra = Math.max(0, dias.size - (primero.fecha === null ? 0 : 1));
  if (extra === 0) return primero.resumen;
  const palabra = extra === 1 ? 'día' : 'días';
  return `${primero.resumen} · se repite en ${extra} ${palabra} más del mes`;
}

function aTarjeta(
  items: readonly Conflicto[],
  estado: TarjetaConflicto['estado'],
  via: TarjetaConflicto['via'],
  nota: string | null,
  deshacerCambio: TarjetaConflicto['deshacerCambio'],
): TarjetaConflicto | null {
  const ordenados = [...items].sort(porFecha);
  const primero = ordenados[0];
  if (primero === undefined) return null;
  return {
    key: primero.key,
    claves: ordenados.map((item) => item.key),
    severidad: primero.severidad,
    tipo: primero.tipo,
    titulo: primero.titulo,
    resumen: resumenAgrupado(ordenados),
    detalle: primero.detalle,
    opciones: primero.opciones,
    exigeOpcion: primero.exigeOpcion,
    etiquetaAccion: estado === 'resuelto' ? '' : primero.etiquetaAccion,
    enlace: estado === 'resuelto' ? false : primero.enlace,
    archivar: estado === 'resuelto' ? null : primero.archivar,
    estado,
    via,
    nota,
    deshacerCambio,
  };
}

function agrupar(items: readonly Conflicto[]): Conflicto[][] {
  const grupos = new Map<string, Conflicto[]>();
  for (const item of items) {
    const lista = grupos.get(item.grupo) ?? [];
    lista.push(item);
    grupos.set(item.grupo, lista);
  }
  return [...grupos.values()];
}

function tarjetaDeCambio(override: DayOverride): TarjetaConflicto {
  const regla = override.conflictKey?.split(':')[0] ?? 'cobertura-supervision';
  const tipo: TipoConflicto = regla.startsWith('descanso') || regla === 'racha-larga' ? 'Descanso' : 'Cobertura';
  return {
    key: override.conflictKey ?? `${override.personKey}:${override.date}`,
    claves: override.conflictKey === null ? [] : [override.conflictKey],
    severidad: 'alta',
    tipo,
    titulo: 'Cobertura asignada',
    resumen: `${override.date} · ${override.reason}`,
    detalle: 'El cambio de jefatura hace que la regla ya no se cumpla. Deshacer lo revoca y el conflicto vuelve a pendientes.',
    opciones: [],
    exigeOpcion: false,
    etiquetaAccion: '',
    enlace: false,
    archivar: null,
    estado: 'resuelto',
    via: 'cambio',
    nota: override.note,
    deshacerCambio: { personKey: override.personKey, date: override.date },
  };
}

export interface ListasConflictos {
  readonly pendientes: readonly TarjetaConflicto[];
  readonly resueltos: readonly TarjetaConflicto[];
}

/** Pendientes y resueltos del panel, en el orden alta → media → baja. */
export function listarConflictos(
  months: readonly ParsedMonth[],
  overrides: readonly DayOverride[],
  acks: readonly AckConflicto[],
): ListasConflictos {
  const detectados = detectarConflictos(months, overrides);
  const notas = new Map(acks.map((ack) => [ack.conflictKey, ack.note]));
  const aceptadas = new Set(notas.keys());

  const abiertos = detectados.filter((item) => !aceptadas.has(item.key));
  const aceptados = detectados.filter((item) => aceptadas.has(item.key));
  const clavesVivas = new Set(detectados.map((item) => item.key));

  const pendientes = agrupar(abiertos)
    .map((grupo) => aTarjeta(grupo, 'pendiente', null, null, null))
    .filter((tarjeta): tarjeta is TarjetaConflicto => tarjeta !== null);

  const resueltosAck = agrupar(aceptados)
    .map((grupo) => {
      const nota = grupo.map((item) => notas.get(item.key)).find((valor) => valor !== undefined && valor !== null) ?? null;
      return aTarjeta(grupo, 'resuelto', 'ack', nota, null);
    })
    .filter((tarjeta): tarjeta is TarjetaConflicto => tarjeta !== null);

  const resueltosCambio = overrides
    .filter((override) => override.conflictKey !== null && !clavesVivas.has(override.conflictKey))
    .map(tarjetaDeCambio);

  const ordenar = (tarjetas: readonly TarjetaConflicto[]): TarjetaConflicto[] =>
    [...tarjetas].sort(
      (a, b) => ORDEN_SEVERIDAD[a.severidad] - ORDEN_SEVERIDAD[b.severidad] || a.titulo.localeCompare(b.titulo, 'es'),
    );

  return {
    pendientes: ordenar(pendientes),
    resueltos: ordenar([...resueltosAck, ...resueltosCambio]),
  };
}
