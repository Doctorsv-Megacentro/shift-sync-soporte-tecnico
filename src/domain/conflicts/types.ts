/**
 * Vocabulario de un conflicto: lo que devuelve cada regla y lo que pinta el
 * panel. No se persiste (ADR-0007). Ficha: docs/features/panel.md.
 */

import type { DateKey } from '../types.ts';

export type Severidad = 'alta' | 'media' | 'baja';

export type TipoConflicto = 'Cobertura' | 'Descanso' | 'Estructura' | 'Formato' | 'Cambios';

/** Un cambio de un día que cierra un hueco de cobertura. */
export interface Asignacion {
  readonly personKey: string;
  readonly date: DateKey;
  readonly startMin: number;
  readonly endMin: number;
  readonly site: string;
  readonly reason: string;
}

/** Guardar el nombre a mostrar que eligió jefatura. */
export interface NombreManual {
  readonly personKey: string;
  readonly displayName: string;
}

export interface OpcionConflicto {
  readonly id: string;
  readonly etiqueta: string;
  readonly asignacion: Asignacion | null;
  readonly nombreManual: NombreManual | null;
}

/**
 * Un caso que dispara una regla. `grupo` junta los que se muestran en la
 * misma tarjeta («se repite en N días más»). `key` es la clave estable
 * `regla:alcance` con la que se asocian acks y cambios.
 */
export interface Conflicto {
  readonly regla: string;
  readonly key: string;
  readonly grupo: string;
  readonly severidad: Severidad;
  readonly tipo: TipoConflicto;
  readonly titulo: string;
  readonly resumen: string;
  readonly detalle: string;
  readonly fecha: DateKey | null;
  readonly opciones: readonly OpcionConflicto[];
  readonly exigeOpcion: boolean;
  readonly etiquetaAccion: string;
  readonly enlace: boolean;
  readonly archivar: { readonly personKey: string; readonly date: DateKey } | null;
}

/** Tarjeta del panel, ya agrupada y clasificada en pendiente o resuelta. */
export interface TarjetaConflicto {
  readonly key: string;
  readonly claves: readonly string[];
  readonly severidad: Severidad;
  readonly tipo: TipoConflicto;
  readonly titulo: string;
  readonly resumen: string;
  readonly detalle: string;
  readonly opciones: readonly OpcionConflicto[];
  readonly exigeOpcion: boolean;
  readonly etiquetaAccion: string;
  readonly enlace: boolean;
  readonly archivar: { readonly personKey: string; readonly date: DateKey } | null;
  readonly estado: 'pendiente' | 'resuelto';
  /** `ack` = aceptado como está. `cambio` = un day_override cerró la regla. */
  readonly via: 'ack' | 'cambio' | null;
  readonly nota: string | null;
  readonly deshacerCambio: { readonly personKey: string; readonly date: DateKey } | null;
}

export interface AckConflicto {
  readonly conflictKey: string;
  readonly note: string | null;
}
