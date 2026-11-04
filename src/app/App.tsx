/**
 * Árbol de rutas de la aplicación (ADR-0015). `/jefe/*` pasa por el
 * guardián de sesión; `/s/:slug` es pública (Fase 3, alcance «toda la
 * operación»); `/demo` es la demo local desechable (ADR-0014).
 */

import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { Demo } from '@/features/demo/Demo.tsx';
import { Empleado } from '@/features/empleado/Empleado.tsx';
import { Fuente } from '@/features/fuente/Fuente.tsx';
import { RutaJefatura } from './RutaJefatura.tsx';

function NoEncontrado() {
  return (
    <main style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: 22 }}>Página no encontrada</h1>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/jefe/fuente" replace />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="/s/:slug" element={<Empleado />} />
        <Route path="/jefe" element={<RutaJefatura />}>
          <Route index element={<Navigate to="fuente" replace />} />
          <Route path="fuente" element={<Fuente />} />
        </Route>
        <Route path="*" element={<NoEncontrado />} />
      </Routes>
    </BrowserRouter>
  );
}
