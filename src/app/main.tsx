/**
 * Punto de entrada de la aplicación. Monta React y carga los estilos raíz.
 * Las rutas llegan en la Fase 2 (necesitan un ADR para elegir enrutador).
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos.css';
import { App } from './App.tsx';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('No se encontró el elemento #root en index.html');

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
