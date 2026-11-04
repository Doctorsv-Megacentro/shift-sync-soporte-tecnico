/**
 * Colores de etiqueta y borde por rol, tomados de los tokens del sistema de
 * diseño (docs/diseno/tokens.md, plan §8). Compartido entre la vista de
 * empleado y, desde la Fase 4, el horario completo.
 */

import type { Role } from '@/domain/types.ts';

export interface ColorRol {
  readonly fondo: string;
  readonly texto: string;
  readonly borde: string;
}

export const COLOR_ROL: Record<Role, ColorRol> = {
  N1: { fondo: 'var(--rol-n1-fondo)', texto: 'var(--rol-n1-texto)', borde: 'var(--rol-n1-borde)' },
  N2: { fondo: 'var(--rol-n2-fondo)', texto: 'var(--rol-n2-texto)', borde: 'var(--rol-n2-borde)' },
  Supervisor: {
    fondo: 'var(--rol-supervisor-fondo)',
    texto: 'var(--rol-supervisor-texto)',
    borde: 'var(--rol-supervisor-borde)',
  },
  Coordinador: {
    fondo: 'var(--rol-coordinador-fondo)',
    texto: 'var(--rol-coordinador-texto)',
    borde: 'var(--rol-coordinador-borde)',
  },
  Producto: {
    fondo: 'var(--rol-producto-fondo)',
    texto: 'var(--rol-producto-texto)',
    borde: 'var(--rol-producto-borde)',
  },
  Tercería: {
    fondo: 'var(--rol-terceria-fondo)',
    texto: 'var(--rol-terceria-texto)',
    borde: 'var(--rol-terceria-borde)',
  },
  Redes: { fondo: 'var(--rol-redes-fondo)', texto: 'var(--rol-redes-texto)', borde: 'var(--rol-redes-borde)' },
  'Soporte de Salas': {
    fondo: 'var(--rol-salas-fondo)',
    texto: 'var(--rol-salas-texto)',
    borde: 'var(--rol-salas-borde)',
  },
  QA: { fondo: 'var(--rol-qa-fondo)', texto: 'var(--rol-qa-texto)', borde: 'var(--rol-qa-borde)' },
  'Activo Fijo': {
    fondo: 'var(--rol-activofijo-fondo)',
    texto: 'var(--rol-activofijo-texto)',
    borde: 'var(--rol-activofijo-borde)',
  },
  Otro: { fondo: 'var(--sinsede-fondo)', texto: 'var(--sinsede-texto)', borde: 'var(--sede-borde)' },
};

/** Fondo/texto de la categoría de un turno (docs/diseno/tokens.md). */
export const COLOR_CATEGORIA: Record<string, { fondo: string; texto: string }> = {
  manana: { fondo: 'var(--turno-manana-fondo)', texto: 'var(--turno-manana-texto)' },
  tarde: { fondo: 'var(--turno-tarde-fondo)', texto: 'var(--turno-tarde-texto)' },
  noche: { fondo: 'var(--turno-noche-fondo)', texto: 'var(--turno-noche-texto)' },
  libre: { fondo: 'var(--turno-libre-fondo)', texto: 'var(--turno-libre-texto)' },
  vacaciones: { fondo: 'var(--turno-vacaciones-fondo)', texto: 'var(--turno-vacaciones-texto)' },
};

/** La etiqueta tal como aparece en el mockup: «Mañana / día», no solo «Mañana». */
export const ETIQUETA_CATEGORIA: Record<string, string> = {
  manana: 'Mañana / día',
  tarde: 'Tarde',
  noche: 'Noche',
  libre: 'Libre',
  vacaciones: 'Vacaciones',
};
