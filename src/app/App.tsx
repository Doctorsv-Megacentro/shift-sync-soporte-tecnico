/**
 * Cáscara de la aplicación. En la Fase 0 solo confirma que el andamiaje y los
 * tokens funcionan; las pantallas reales llegan desde la Fase 2.
 */

export function App() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <p
        style={{
          font: '600 11px var(--fuente-texto)',
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: 'var(--apagado)',
        }}
      >
        Fase 0 · Andamiaje
      </p>
      <h1 style={{ fontSize: 32, margin: '.25rem 0 .5rem' }}>ShiftSync</h1>
      <p style={{ color: 'var(--texto-2)', lineHeight: 1.6 }}>
        Horario de la operación. Las pantallas se construyen por fases: el plan está en{' '}
        <code style={{ fontFamily: 'var(--fuente-mono)' }}>docs/plan-implementacion.md</code> y el
        estado en <code style={{ fontFamily: 'var(--fuente-mono)' }}>docs/progreso.md</code>.
      </p>
    </main>
  );
}
