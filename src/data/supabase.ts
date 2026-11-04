/**
 * El cliente de Supabase para el navegador. Único punto que crea el cliente;
 * el resto de `src/data/` lo importa de aquí. Nunca se usa la clave de
 * servicio aquí: esa vive solo en `/api` (docs/operacion/variables-entorno.md).
 */

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env['VITE_SUPABASE_URL'];
const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local y rellénalas.',
  );
}

export const supabase = createClient(url, anonKey);
