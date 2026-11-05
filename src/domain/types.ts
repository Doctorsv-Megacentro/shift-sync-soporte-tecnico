/**
 * Tipos del dominio. Es el vocabulario del producto en código: cada tipo de
 * aquí aparece en el glosario de docs/producto/prd.md con su nombre en español.
 */

/** Fecha local en texto `YYYY-MM-DD`. Nunca un `Date` (ADR-0008). */
export type DateKey = string;

/** Minutos desde medianoche. Puede pasar de 1440 si el turno cruza el día. */
export type Minutes = number;

/** Qué dice la celda de un día. */
export type ShiftKind = 'work' | 'off' | 'vacation' | 'unknown';

/**
 * El valor de una celda ya interpretado. Siempre se conserva `raw`: es lo que
 * venía en la hoja, y la hoja es la fuente de verdad (ADR-0003).
 */
export type ShiftValue =
  | { kind: 'work'; startMin: Minutes; endMin: Minutes; raw: string }
  | { kind: 'off'; raw: string }
  | { kind: 'vacation'; raw: string }
  | { kind: 'unknown'; raw: string };

/** Los 10 roles del catálogo, más `Otro` para lo que no se reconoce. */
export type Role =
  | 'N1'
  | 'N2'
  | 'Supervisor'
  | 'Coordinador'
  | 'Producto'
  | 'Tercería'
  | 'Redes'
  | 'Soporte de Salas'
  | 'QA'
  | 'Activo Fijo'
  | 'Otro';

/** Las 6 sedes, más `Sin sede` para los departamentos transversales. */
export type Site =
  | 'Megacentro'
  | 'Tuscania'
  | 'Phoenix Tower'
  | 'Atento'
  | 'Santa Ana'
  | 'San Miguel'
  | 'Sin sede';

/** Categoría de color de un turno, por su hora de entrada (plan §5.3). */
export type ShiftCategory = 'manana' | 'tarde' | 'noche' | 'libre' | 'vacaciones';

/** Franja del panel de jefatura. Es otra cosa que la categoría de color. */
export type Band = 'Mañana' | 'Día' | 'Tarde' | 'Noche';

/** Cómo se resolvió un departamento contra el catálogo. */
export type CatalogMatch = 'exact' | 'alias' | 'rule' | 'unknown';

/** Departamento resuelto a rol, sede y área. */
export interface DepartmentInfo {
  readonly role: Role;
  readonly site: Site;
  readonly area: string | null;
  readonly match: CatalogMatch;
}

/**
 * Una persona tal como aparece en una pestaña. `key` es la clave estable que
 * une a la misma persona entre meses, aunque su nombre venga escrito distinto.
 */
export interface SheetPerson {
  readonly key: string;
  /** El nombre tal como venía en la celda, sin tocar. */
  readonly rawName: string;
  readonly displayName: string;
  readonly department: string;
  readonly role: Role;
  readonly site: Site;
  readonly area: string | null;
  /** Fecha de ingreso, si el nombre traía el sufijo `(d/m)`. */
  readonly joinedOn: DateKey | null;
  /** El orden nombre/apellido es dudoso y jefatura debería revisarlo. */
  readonly needsReview: boolean;
  /** `manual` si jefatura ya eligió el nombre a mostrar. Si falta, es `auto`. */
  readonly displayNameSource?: 'auto' | 'manual';
  /** Fila de la hoja (base 1), para poder señalarla en un aviso. */
  readonly row: number;
}

/** El día de una persona, tal como venía en la hoja. */
export interface ScheduleEntry {
  readonly personKey: string;
  readonly date: DateKey;
  readonly department: string;
  readonly shift: ShiftValue;
}

/** Una pestaña leída. */
export interface ParsedMonth {
  readonly sheetName: string;
  readonly hidden: boolean;
  /** Primer día del mes, en `YYYY-MM-01`. */
  readonly month: DateKey;
  readonly dates: readonly DateKey[];
  readonly people: readonly SheetPerson[];
  readonly entries: readonly ScheduleEntry[];
}

/** Una pestaña que no se pudo leer. No rompe la importación: se avisa. */
export interface SkippedSheet {
  readonly sheetName: string;
  readonly reason: string;
}

/**
 * Aviso de importación. El `code` coincide con el id de la regla de conflicto
 * equivalente (docs/datos/reglas-conflictos.md), para poder enlazarlos.
 */
export interface Warning {
  readonly code: WarningCode;
  readonly severity: 'alta' | 'media' | 'baja';
  /** Una línea en lenguaje de usuario. */
  readonly message: string;
  readonly sheetName?: string;
  readonly personKey?: string;
  readonly date?: DateKey;
  readonly row?: number;
}

export type WarningCode =
  | 'valor-no-reconocido'
  | 'persona-duplicada'
  | 'departamento-desconocido'
  | 'departamento-mal-escrito'
  | 'fecha-en-nombre'
  | 'vacaciones-mayusculas'
  | 'nombre-con-coma'
  | 'orden-nombre-dudoso'
  | 'pestana-ignorada'
  | 'columna-ignorada';

/** El libro entero, ya leído. */
export interface ParsedWorkbook {
  readonly months: readonly ParsedMonth[];
  readonly skipped: readonly SkippedSheet[];
  readonly warnings: readonly Warning[];
}

/** Cambios de un mes contra el anterior (plan §6.4). */
export interface MonthDiff {
  readonly from: DateKey;
  readonly to: DateKey;
  readonly joined: readonly { personKey: string; displayName: string; joinedOn: DateKey | null }[];
  readonly left: readonly { personKey: string; displayName: string }[];
  readonly movedDepartment: readonly {
    personKey: string;
    displayName: string;
    fromDepartment: string;
    toDepartment: string;
  }[];
}
