/**
 * Punto de entrada del panel: detectar conflictos y armar las tarjetas.
 * Cada regla vive en su archivo. Ficha: docs/features/panel.md.
 */

export { detectarConflictos, listarConflictos } from './evaluar.ts';
export type { ListasConflictos } from './evaluar.ts';
export type { AckConflicto, Conflicto, TarjetaConflicto } from './types.ts';
