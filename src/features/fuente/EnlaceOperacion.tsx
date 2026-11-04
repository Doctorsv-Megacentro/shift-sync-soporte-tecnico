/**
 * Botón mínimo para crear, copiar y revocar el enlace de «toda la
 * operación», con vencimiento «fin de mes» (plan §7.2, Fase 3). La pantalla
 * completa de Compartir, con los demás alcances y vencimientos, llega en la
 * Fase 7.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  crearEnlaceOperacion,
  obtenerEnlaceOperacionActivo,
  revocarEnlace,
  type EnlaceActivo,
} from '@/data/shareLinks.ts';

function urlDe(slug: string): string {
  return `${window.location.origin}/s/${slug}`;
}

export function EnlaceOperacion() {
  const [enlace, setEnlace] = useState<EnlaceActivo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const campoRef = useRef<HTMLInputElement>(null);

  async function cargar() {
    setEnlace(await obtenerEnlaceOperacionActivo());
    setCargando(false);
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function onCrear() {
    setCargando(true);
    const nuevo = await crearEnlaceOperacion('fin-de-mes');
    setEnlace(nuevo);
    setCargando(false);
  }

  async function onRevocar() {
    if (enlace === null) return;
    await revocarEnlace(enlace.slug);
    setEnlace(null);
  }

  async function onCopiar() {
    if (enlace === null) return;
    const url = urlDe(enlace.slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      campoRef.current?.select();
    }
  }

  return (
    <section style={estiloTarjeta}>
      <p style={estiloEtiqueta}>Enlace de la operación</p>
      {cargando ? (
        <p style={{ color: 'var(--texto-3)' }}>Cargando…</p>
      ) : enlace === null ? (
        <>
          <p style={{ color: 'var(--texto-2)', marginTop: 0 }}>
            Sin enlace activo. Vence fin de mes.
          </p>
          <button type="button" onClick={() => void onCrear()} style={estiloBotonPrimario}>
            Crear enlace
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input ref={campoRef} readOnly value={urlDe(enlace.slug)} style={estiloCampo} />
            <button type="button" onClick={() => void onCopiar()} style={estiloBotonSecundario}>
              {copiado ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--texto-3)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Vence {new Date(enlace.expiresAt).toLocaleDateString('es')}</span>
            <button type="button" onClick={() => void onRevocar()} style={estiloEnlaceRevocar}>
              Revocar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

const estiloTarjeta: CSSProperties = {
  border: '1px solid var(--borde-suave)',
  borderRadius: 'var(--radio-tarjeta)',
  padding: 16,
  marginBottom: 24,
  background: 'var(--superficie)',
};

const estiloEtiqueta: CSSProperties = {
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--apagado)',
  fontWeight: 600,
  margin: '0 0 8px',
};

const estiloCampo: CSSProperties = {
  flex: 1,
  padding: '8px 10px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  fontFamily: 'var(--fuente-mono)',
  fontSize: 13,
};

const estiloBotonPrimario: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radio-control)',
  border: 'none',
  background: 'var(--primario)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  minHeight: 'var(--tactil-min)',
};

const estiloBotonSecundario: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radio-control)',
  border: '1px solid var(--borde)',
  background: 'var(--superficie)',
  cursor: 'pointer',
  fontSize: 13,
  minHeight: 'var(--tactil-min)',
  whiteSpace: 'nowrap',
};

const estiloEnlaceRevocar: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--peligro)',
  cursor: 'pointer',
  fontSize: 13,
  padding: 0,
};
