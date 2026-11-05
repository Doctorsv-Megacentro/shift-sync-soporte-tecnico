/**
 * Constructor común de un conflicto, para que cada regla solo escriba lo que
 * la distingue. Ficha: docs/features/panel.md.
 */

import type { DateKey } from '../types.ts';
import type { Conflicto, OpcionConflicto, Severidad, TipoConflicto } from './types.ts';

export function armar(campos: {
  readonly regla: string;
  readonly key: string;
  readonly grupo: string;
  readonly severidad: Severidad;
  readonly tipo: TipoConflicto;
  readonly titulo: string;
  readonly resumen: string;
  readonly detalle: string;
  readonly fecha?: DateKey | null;
  readonly opciones?: readonly OpcionConflicto[];
  readonly exigeOpcion?: boolean;
  readonly etiquetaAccion?: string;
  readonly enlace?: boolean;
  readonly archivar?: { readonly personKey: string; readonly date: DateKey } | null;
}): Conflicto {
  return {
    regla: campos.regla,
    key: campos.key,
    grupo: campos.grupo,
    severidad: campos.severidad,
    tipo: campos.tipo,
    titulo: campos.titulo,
    resumen: campos.resumen,
    detalle: campos.detalle,
    fecha: campos.fecha ?? null,
    opciones: campos.opciones ?? [],
    exigeOpcion: campos.exigeOpcion ?? false,
    etiquetaAccion: campos.etiquetaAccion ?? '',
    enlace: campos.enlace ?? false,
    archivar: campos.archivar ?? null,
  };
}
