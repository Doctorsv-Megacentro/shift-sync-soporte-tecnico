/**
 * Verifica la lógica de datos de `publish_import` y `activate_import`, más
 * allá de la seguridad (eso está en rls.test.ts): el upsert de personas, las
 * entradas del día, `content_hash` y volver a una versión anterior.
 * Corre contra el stack local de Supabase (`npm run test:db`).
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { clienteServicio, crearUsuarioAutenticado } from './helpers.ts';

const usuariosDePrueba: string[] = [];

afterAll(async () => {
  const servicio = clienteServicio();
  for (const email of usuariosDePrueba) {
    const { data } = await servicio.auth.admin.listUsers();
    const usuario = data.users.find((u) => u.email === email);
    if (usuario) await servicio.auth.admin.deleteUser(usuario.id);
  }
});

async function admin() {
  const u = await crearUsuarioAutenticado({ admin: true });
  usuariosDePrueba.push(u.email);
  return u.cliente;
}

beforeEach(async () => {
  // Este archivo se puede ejecutar varias veces contra el mismo stack. La
  // prueba del nombre manual no debe contaminar la siguiente corrida.
  await clienteServicio()
    .from('people')
    .update({ display_name: 'Ana Lucia Rosales', display_name_source: 'auto' })
    .eq('key', 'ANA LUCIA ROSALES');
});

// Payload con la misma forma que arma src/data/imports.ts a partir de un
// ParsedWorkbook. Nombres ficticios (ADR-0011).
function payloadDeNoviembre(contentHash: string) {
  return {
    source: 'excel' as const,
    source_label: 'prueba.xlsx',
    sheet_gid: null,
    content_hash: contentHash,
    summary: { personas: 1 },
    warnings: [],
    months: [
      {
        month: '2026-11-01',
        people: [
          {
            key: 'ANA LUCIA ROSALES',
            raw_name: 'ROSALES ANA LUCIA',
            display_name: 'Ana Lucia Rosales',
            joined_on: null,
          },
        ],
        entries: [
          {
            person_key: 'ANA LUCIA ROSALES',
            date: '2026-11-02',
            department: 'MEGA N1',
            raw: '06:00-15:00',
            kind: 'work',
            start_min: 360,
            end_min: 900,
          },
          {
            person_key: 'ANA LUCIA ROSALES',
            date: '2026-11-03',
            department: 'MEGA N1',
            raw: 'Libre',
            kind: 'off',
            start_min: null,
            end_min: null,
          },
        ],
      },
    ],
  };
}

describe('publish_import: datos', () => {
  it('crea la persona y sus entradas del día', async () => {
    const cliente = await admin();
    const { data: importId, error } = await cliente.rpc('publish_import', {
      payload: payloadDeNoviembre(`hash-${Date.now()}-a`),
    });
    expect(error).toBeNull();

    const { data: persona } = await cliente
      .from('people')
      .select('display_name, key')
      .eq('key', 'ANA LUCIA ROSALES')
      .single();
    expect(persona?.display_name).toBe('Ana Lucia Rosales');

    const { data: entradas } = await cliente
      .from('schedule_entries')
      .select('date, kind, start_min, end_min')
      .eq('import_id', importId)
      .order('date');
    expect(entradas).toHaveLength(2);
    expect(entradas?.[0]).toMatchObject({ date: '2026-11-02', kind: 'work', start_min: 360, end_min: 900 });
    expect(entradas?.[1]).toMatchObject({ date: '2026-11-03', kind: 'off' });

    const { data: version } = await cliente
      .from('month_versions')
      .select('import_id')
      .eq('month', '2026-11-01')
      .single();
    expect(version?.import_id).toBe(importId);
  });

  it('publicar el mismo contenido y meses otra vez no crea una versión nueva', async () => {
    const cliente = await admin();
    const hash = `hash-${Date.now()}-b`;
    const { data: primero, error: e1 } = await cliente.rpc('publish_import', {
      payload: payloadDeNoviembre(hash),
    });
    expect(e1).toBeNull();
    expect(primero).not.toBeNull();

    const { error: e2 } = await cliente.rpc('publish_import', { payload: payloadDeNoviembre(hash) });
    expect(e2).not.toBeNull();
    expect(e2?.message).toMatch(/SIN_CAMBIOS/);
  });

  it('una persona con display_name_source manual no se sobrescribe en la siguiente carga', async () => {
    const cliente = await admin();
    await cliente.rpc('publish_import', { payload: payloadDeNoviembre(`hash-${Date.now()}-c1`) });

    // Jefatura corrige el nombre a mano (lo que hará la pantalla de la
    // Fase 2/3; aquí se simula directo en la base).
    await cliente
      .from('people')
      .update({ display_name: 'Ana Lucía Rosales (corregido)', display_name_source: 'manual' })
      .eq('key', 'ANA LUCIA ROSALES');

    // Nueva carga con el mismo nombre crudo: no debe pisar la corrección.
    await cliente.rpc('publish_import', { payload: payloadDeNoviembre(`hash-${Date.now()}-c2`) });

    const { data: persona } = await cliente
      .from('people')
      .select('display_name, display_name_source')
      .eq('key', 'ANA LUCIA ROSALES')
      .single();
    expect(persona?.display_name).toBe('Ana Lucía Rosales (corregido)');
    expect(persona?.display_name_source).toBe('manual');
  });

  it('volver a una versión anterior cambia la versión activa del mes', async () => {
    const cliente = await admin();
    const { data: v1 } = await cliente.rpc('publish_import', {
      payload: payloadDeNoviembre(`hash-${Date.now()}-d1`),
    });
    const { data: v2 } = await cliente.rpc('publish_import', {
      payload: payloadDeNoviembre(`hash-${Date.now()}-d2`),
    });

    const { data: activaDespuesDeV2 } = await cliente
      .from('month_versions')
      .select('import_id')
      .eq('month', '2026-11-01')
      .single();
    expect(activaDespuesDeV2?.import_id).toBe(v2);

    const { error: errorVolver } = await cliente.rpc('activate_import', {
      p_import_id: v1,
      p_month: '2026-11-01',
    });
    expect(errorVolver).toBeNull();

    const { data: activaDespuesDeVolver } = await cliente
      .from('month_versions')
      .select('import_id')
      .eq('month', '2026-11-01')
      .single();
    expect(activaDespuesDeVolver?.import_id).toBe(v1);
  });

  it('no deja volver a una versión que no cubre ese mes', async () => {
    const cliente = await admin();
    const { data: importId } = await cliente.rpc('publish_import', {
      payload: payloadDeNoviembre(`hash-${Date.now()}-e`),
    });

    const { error } = await cliente.rpc('activate_import', {
      p_import_id: importId,
      p_month: '2026-01-01',
    });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/IMPORT_NO_CUBRE_EL_MES/);
  });
});
