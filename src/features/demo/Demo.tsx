/**
 * Orquesta la demo local: carga un .xlsx en el navegador, lo interpreta con
 * `domain/workbook.ts` y muestra la vista de empleado. Decisión y alcance
 * documentados en ADR-0014; ficha: docs/features/demo.md.
 */

import { useMemo, useState } from 'react';
import { ExcelDemasiadoGrande, ExcelIlegible, leerArchivoExcel } from '@/data/excel.ts';
import { parseWorkbook } from '@/domain/workbook.ts';
import type { ParsedWorkbook } from '@/domain/types.ts';
import { VistaEmpleado } from './VistaEmpleado.tsx';

type Estado =
  | { tipo: 'vacio' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; libro: ParsedWorkbook; nombreArchivo: string };

const NOMBRE_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function tituloMes(month: string): string {
  const [anio, mesNum] = month.split('-');
  const nombre = NOMBRE_MES[Number(mesNum) - 1] ?? '';
  return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export function Demo() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'vacio' });
  const [indiceMes, setIndiceMes] = useState(0);

  async function onArchivo(file: File) {
    setEstado({ tipo: 'cargando' });
    try {
      const hojas = await leerArchivoExcel(file);
      const libro = parseWorkbook(hojas);
      if (libro.months.length === 0) {
        setEstado({
          tipo: 'error',
          mensaje: 'No se encontró ningún mes legible en el archivo. Revisa que la fila 2 tenga fechas.',
        });
        return;
      }
      // Por defecto se muestra el último mes visible, no uno oculto.
      const visibles = libro.months.filter((m) => !m.hidden);
      const activo = visibles.at(-1) ?? libro.months[0];
      setIndiceMes(libro.months.indexOf(activo!));
      setEstado({ tipo: 'listo', libro, nombreArchivo: file.name });
    } catch (e) {
      const mensaje =
        e instanceof ExcelDemasiadoGrande || e instanceof ExcelIlegible
          ? e.message
          : 'No se pudo leer el archivo. Comprueba que sea un .xlsx.';
      setEstado({ tipo: 'error', mensaje });
    }
  }

  const mesActivo = estado.tipo === 'listo' ? estado.libro.months[indiceMes] : undefined;

  const resumenAvisos = useMemo(() => {
    if (estado.tipo !== 'listo') return null;
    const n = estado.libro.warnings.length;
    const s = estado.libro.skipped.length;
    return { avisos: n, saltadas: s };
  }, [estado]);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div
        style={{
          background: 'var(--aviso-fondo)',
          border: '1px solid var(--aviso-borde)',
          color: 'var(--aviso-texto)',
          borderRadius: 'var(--radio-control)',
          padding: '8px 12px',
          fontSize: 13,
          marginBottom: 20,
        }}
      >
        Demo local — lee el Excel en tu navegador, sin Supabase ni enlaces. No es la Fase 3. Ver{' '}
        <code style={{ fontFamily: 'var(--fuente-mono)' }}>docs/features/demo.md</code>.
      </div>

      {estado.tipo !== 'listo' && (
        <>
          <h1 style={{ fontSize: 24, margin: '0 0 4px' }}>ShiftSync</h1>
          <p style={{ color: 'var(--texto-2)', margin: '0 0 20px' }}>
            Sube el horario (.xlsx) para ver la vista de empleado.
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onArchivo(file);
            }}
            disabled={estado.tipo === 'cargando'}
          />
          {estado.tipo === 'cargando' && (
            <p style={{ color: 'var(--texto-3)', marginTop: 12 }}>Leyendo…</p>
          )}
          {estado.tipo === 'error' && (
            <p
              role="alert"
              style={{
                color: 'var(--peligro)',
                background: '#fdeaea',
                borderRadius: 'var(--radio-control)',
                padding: '10px 12px',
                marginTop: 12,
              }}
            >
              {estado.mensaje}
            </p>
          )}
        </>
      )}

      {estado.tipo === 'listo' && mesActivo && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <strong>ShiftSync</strong>
              <span style={{ color: 'var(--texto-3)' }}> · Horario de la operación · </span>
              <strong>{tituloMes(mesActivo.month)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {estado.libro.months.length > 1 && (
                <select
                  value={indiceMes}
                  onChange={(e) => setIndiceMes(Number(e.target.value))}
                  style={{ padding: '6px 8px', borderRadius: 'var(--radio-control)' }}
                >
                  {estado.libro.months.map((m, i) => (
                    <option key={m.sheetName} value={i}>
                      {m.sheetName}
                      {m.hidden ? ' (oculta)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setEstado({ tipo: 'vacio' })}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radio-control)',
                  border: '1px solid var(--borde)',
                  background: 'var(--superficie)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cargar otro archivo
              </button>
            </div>
          </div>

          {resumenAvisos && (resumenAvisos.avisos > 0 || resumenAvisos.saltadas > 0) && (
            <p style={{ fontSize: 13, color: 'var(--texto-3)', marginBottom: 16 }}>
              {resumenAvisos.avisos} {resumenAvisos.avisos === 1 ? 'aviso' : 'avisos'} de importación
              {resumenAvisos.saltadas > 0 &&
                ` · ${resumenAvisos.saltadas} ${resumenAvisos.saltadas === 1 ? 'pestaña' : 'pestañas'} ignorada(s)`}
            </p>
          )}

          <VistaEmpleado key={mesActivo.sheetName} mes={mesActivo} />
        </>
      )}
    </main>
  );
}
