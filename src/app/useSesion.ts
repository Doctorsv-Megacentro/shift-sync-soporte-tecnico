/**
 * Estado de la sesión de jefatura: sin sesión, con sesión pero sin acceso
 * (correo fuera de `admins`), o jefatura. Documentado en
 * docs/arquitectura/seguridad.md; decisión: ADR-0006.
 */

import { useEffect, useState } from 'react';
import { esAdmin } from '@/data/auth.ts';
import { supabase } from '@/data/supabase.ts';

export type EstadoSesion =
  | { tipo: 'cargando' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'sin-acceso'; email: string }
  | { tipo: 'jefatura'; email: string };

export function useSesion(): EstadoSesion {
  const [estado, setEstado] = useState<EstadoSesion>({ tipo: 'cargando' });

  useEffect(() => {
    let vigente = true;

    async function evaluar(email: string | null | undefined) {
      if (!email) {
        if (vigente) setEstado({ tipo: 'sin-sesion' });
        return;
      }
      const admin = await esAdmin();
      if (!vigente) return;
      setEstado(admin ? { tipo: 'jefatura', email } : { tipo: 'sin-acceso', email });
    }

    void supabase.auth.getSession().then(({ data }) => evaluar(data.session?.user.email));

    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      void evaluar(session?.user.email);
    });

    return () => {
      vigente = false;
      suscripcion.subscription.unsubscribe();
    };
  }, []);

  return estado;
}
