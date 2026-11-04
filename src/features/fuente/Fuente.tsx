/**
 * Fuente de datos: subir el Excel, revisar el resumen de lectura, publicar
 * una versión y volver a una anterior. Plan §7.2, capturas 06–07. ADR-0004,
 * ADR-0005 (Google Sheets, Propuesto), ADR-0010. Ficha: docs/features/fuente.md.
 */

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { leerLibroExcel, ExcelDemasiadoGrande, ExcelIlegible } from '@/data/excel.ts';
import { hashContenido } from '@/data/content-hash.ts';
import {
  NoAutorizado,
  SinCambios,
  activarVersion,
  listarHistorialDeMes,
  listarVersionesActivas,
  publicarImport,
  type VersionActiva,
  type VersionHistorial,
} from '@/data/imports.ts';
import { diffMonths, resumirDiff } from '@/domain/diff.ts';
import { addDays, firstOfMonth } from '@/domain/time.ts';
import { validateMonth } from '@/domain/validate.ts';
import { parseWorkbook, resumirMes } from '@/domain/workbook.ts';
import type { ParsedMonth, ParsedWorkbook, Warning } from '@/domain/types.ts';

type Estado =
  | { tipo: 'vacio' }
  | { tipo: 'leyendo' }
  | { tipo: 'error'; mensaje: string }
  | {
      tipo: 'listo';
      archivo: File;
      libro: ParsedWorkbook;
      contentHash: string;
      warningsPorMes: Map<string, Warning[]>;
      seleccionados: Set<string>;
    }
  | { tipo: 'publicando' }
  | { tipo: 'publicado' };

/** El mes inmediatamente anterior, si también viene en el mismo libro. */
function mesAnteriorEnElLibro(libro: ParsedWorkbook, mes: ParsedMonth): ParsedMonth | null {
  const anterior = addDays(firstOfMonth(mes.month), -1);
  const mesAnteriorClave = firstOfMonth(anterior);
  return libro.months.find((m) => m.month === mesAnteriorClave) ?? null;
}

export function Fuente() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'vacio' });
  const [activas, setActivas] = useState<VersionActiva[]>([]);
  const [historiales, setHistoriales] = useState<Map<string, VersionHistorial[]>>(new Map());
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);

  async function cargarActivas() {
    try {
      setActivas(await listarVersionesActivas());
    } catch {
      // La tarjeta «Fuente actual» queda vacía; no bloquea el resto.
    }
  }

  useEffect(() => {
    void cargarActivas();
  }, []);

  async function onArchivo(file: File) {
    setEstado({ tipo: 'leyendo' });
    try {
      const bytes = await file.arrayBuffer();
      const hojas = leerLibroExcel(bytes);
      const libro = parseWorkbook(hojas);
      if (libro.months.length === 0) {
        setEstado({ tipo: 'error', mensaje: 'No se encontró ningún mes legible en el archivo.' });
        return;
      }

      const warningsPorMes = new Map(libro.months.map((m) => [m.sheetName, validateMonth(m)]));
      const seleccionados = new Set(libro.months.filter((m) => !m.hidden).map((m) => m.sheetName));

      setEstado({
        tipo: 'listo',
        archivo: file,
        libro,
        contentHash: await hashContenido(bytes),
        warningsPorMes,
        seleccionados,
      });
    } catch (e) {
      const mensaje =
        e instanceof ExcelDemasiadoGrande || e instanceof ExcelIlegible
          ? e.message
          : 'No se pudo leer el archivo. Comprueba que sea un .xlsx.';
      setEstado({ tipo: 'error', mensaje });
    }
  }

  async function onPublicar() {
    if (estado.tipo !== 'listo') return;
    const meses = estado.libro.months.filter((m) => estado.seleccionados.has(m.sheetName));
    if (meses.length === 0) return;

    setEstado({ tipo: 'publicando' });
    try {
      const warnings = meses.flatMap((m) => estado.warningsPorMes.get(m.sheetName) ?? []);
      await publicarImport({
        source: 'excel',
        sourceLabel: estado.archivo.name,
        contentHash: estado.contentHash,
        months: meses,
        warnings,
      });
      setEstado({ tipo: 'publicado' });
      await cargarActivas();
      setHistoriales(new Map());
    } catch (e) {
      const mensaje =
        e instanceof SinCambios
          ? 'No hay cambios desde la última carga.'
          : e instanceof NoAutorizado
            ? e.message
            : 'No se pudo publicar. Vuelve a intentarlo.';
      setEstado({ tipo: 'error', mensaje });
    }
  }

  async function onVerHistorial(month: string) {
    setMesExpandido(mesExpandido === month ? null : month);
    if (!historiales.has(month)) {
      const lista = await listarHistorialDeMes(month);
      setHistoriales(new Map(historiales).set(month, lista));
    }
  }

  async function onVolverAVersion(importId: string, month: string) {
    await activarVersion(importId, month);
    await cargarActivas();
    setHistoriales(new Map());
    setMesExpandido(null);
  }

  const resumenes = useMemo(() => {
    if (estado.tipo !== 'listo') return [];
    return estado.libro.months.map((mes) => ({
      mes,
      resumen: resumirMes(mes),
      warnings: estado.warningsPorMes.get(mes.sheetName) ?? [],
      anterior: mesAnteriorEnElLibro(estado.libro, mes),
    }));
  }, [estado]);

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 22, margin: '0 0 20px' }}>Fuente de datos</h1>

      <section
        style={{
          border: '1px solid var(--borde-suave)',
          borderRadius: 'var(--radio-tarjeta)',
          padding: 16,
          marginBottom: 24,
          background: 'var(--superficie)',
        }}
      >
        <p style={estiloEtiqueta}>Fuente actual</p>
        {activas.length === 0 ? (
          <p style={{ color: 'var(--apagado)', margin: 0 }}>Todavía no se ha publicado nada.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {activas.map((v) => (
              <li
                key={v.month}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid var(--borde-suave-2)',
                  fontSize: 14,
                }}
              >
                <span>
                  <strong>{v.month}</strong> · {v.sourceLabel}
                </span>
                <button
                  type="button"
                  onClick={() => void onVerHistorial(v.month)}
                  style={estiloEnlace}
                >
                  Historial
                </button>
              </li>
            ))}
          </ul>
        )}
        {activas.map(
          (v) =>
            mesExpandido === v.month && (
              <div key={`h-${v.month}`} style={{ marginTop: 10 }}>
                {(historiales.get(v.month) ?? []).map((h) => (
                  <div
                    key={h.importId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                      padding: '4px 0',
                    }}
                  >
                    <span>
                      {h.sourceLabel} · {new Date(h.importedAt).toLocaleString('es')}
                      {h.activa ? ' · activa' : ''}
                    </span>
                    {!h.activa && (
                      <button
                        type="button"
                        onClick={() => void onVolverAVersion(h.importId, v.month)}
                        style={estiloEnlace}
                      >
                        Volver a esta versión
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ),
        )}
      </section>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ ...estiloPestana, borderColor: 'var(--primario)', color: 'var(--primario)' }}>
          Subir Excel (.xlsx)
        </div>
        <div style={{ ...estiloPestana, color: 'var(--apagado)' }}>
          Enlace o ID de Google Sheets
          <span style={{ fontSize: 10, marginLeft: 6, textTransform: 'uppercase' }}>Próximamente</span>
        </div>
      </div>

      {estado.tipo === 'vacio' || estado.tipo === 'error' || estado.tipo === 'leyendo' ? (
        <>
          <input
            type="file"
            accept=".xlsx"
            disabled={estado.tipo === 'leyendo'}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onArchivo(file);
            }}
          />
          {estado.tipo === 'leyendo' && <p style={{ color: 'var(--texto-3)' }}>Leyendo…</p>}
          {estado.tipo === 'error' && (
            <p role="alert" style={estiloError}>
              {estado.mensaje}
            </p>
          )}
        </>
      ) : null}

      {estado.tipo === 'listo' && (
        <>
          <p style={estiloEtiqueta}>Resumen de lectura</p>
          {resumenes.map(({ mes, resumen, warnings, anterior }) => (
            <label
              key={mes.sheetName}
              style={{
                display: 'block',
                border: '1px solid var(--borde-suave)',
                borderRadius: 'var(--radio-control)',
                padding: 12,
                marginBottom: 8,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={estado.seleccionados.has(mes.sheetName)}
                  onChange={(e) => {
                    const siguiente = new Set(estado.seleccionados);
                    if (e.target.checked) siguiente.add(mes.sheetName);
                    else siguiente.delete(mes.sheetName);
                    setEstado({ ...estado, seleccionados: siguiente });
                  }}
                />
                <strong>{mes.sheetName}</strong>
                {mes.hidden && (
                  <span style={{ fontSize: 11, color: 'var(--apagado)' }}>(oculta en la hoja)</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--texto-3)', marginTop: 4, marginLeft: 24 }}>
                {resumen.personas} personas · {resumen.departamentos} departamentos ·{' '}
                {resumen.sedes} sedes · {resumen.dias} días
                {warnings.length > 0 && ` · ${warnings.length} avisos`}
              </div>
              {anterior && (
                <div style={{ fontSize: 13, color: 'var(--texto-3)', marginLeft: 24 }}>
                  {resumirDiff(diffMonths(anterior, mes)).join(' · ') || 'Sin cambios contra el mes anterior'}
                </div>
              )}
            </label>
          ))}

          <button
            type="button"
            onClick={() => void onPublicar()}
            disabled={estado.seleccionados.size === 0}
            style={estiloBotonPrimario}
          >
            Publicar esta versión
          </button>
        </>
      )}

      {estado.tipo === 'publicando' && <p style={{ color: 'var(--texto-3)' }}>Publicando…</p>}

      {estado.tipo === 'publicado' && (
        <p
          role="status"
          style={{
            background: 'var(--exito-fondo)',
            color: 'var(--exito-texto)',
            borderRadius: 'var(--radio-control)',
            padding: '10px 12px',
          }}
        >
          Versión publicada.
        </p>
      )}

      <section style={{ marginTop: 24 }}>
        <p style={estiloEtiqueta}>Cómo debe venir la hoja</p>
        <p style={{ fontSize: 13, color: 'var(--texto-3)' }}>
          Una pestaña por mes. Columna A: departamento. Columna B: nombre. Fila 2: las fechas. Los
          turnos van como <code>HH:MM-HH:MM</code>, o <code>Libre</code> / <code>Vacaciones</code>.
          Detalle completo: <code>docs/datos/formato-hoja.md</code>.
        </p>
      </section>
    </div>
  );
}

const estiloEtiqueta: CSSProperties = {
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--apagado)',
  fontWeight: 600,
  margin: '0 0 8px',
};

const estiloEnlace: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--primario)',
  cursor: 'pointer',
  fontSize: 13,
  padding: 0,
};

const estiloPestana: CSSProperties = {
  padding: '8px 12px',
  borderBottom: '2px solid transparent',
  fontSize: 14,
};

const estiloBotonPrimario: CSSProperties = {
  padding: '10px 16px',
  borderRadius: 'var(--radio-control)',
  border: 'none',
  background: 'var(--primario)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  minHeight: 'var(--tactil-min)',
};

const estiloError: CSSProperties = {
  color: 'var(--peligro)',
  background: '#fdeaea',
  borderRadius: 'var(--radio-control)',
  padding: '10px 12px',
};
