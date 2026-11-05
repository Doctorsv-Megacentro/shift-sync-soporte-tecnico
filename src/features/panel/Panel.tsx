/**
 * Punto de entrada de `/jefe/panel`. Los datos los carga el layout de
 * jefatura, que también pinta el conteo del menú. Ficha: docs/features/panel.md.
 */

import { useOutletContext } from 'react-router-dom';
import type { ContextoJefatura } from '@/app/RutaJefatura.tsx';
import { VistaPanel } from './VistaPanel.tsx';

export function Panel() {
  const ctx = useOutletContext<ContextoJefatura>();

  if (ctx.carga === 'cargando' || ctx.carga === 'idle') {
    return <p style={{ color: 'var(--texto-2)' }}>Cargando…</p>;
  }
  if (ctx.carga === 'error' || ctx.datos === null) {
    return <p style={{ color: 'var(--texto-2)' }}>No se pudo cargar el panel. Vuelve a intentarlo.</p>;
  }
  return <VistaPanel datos={ctx.datos} onCambio={ctx.recargar} />;
}
