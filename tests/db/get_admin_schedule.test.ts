/**
 * Verifica `get_admin_schedule`: solo admin puede llamarla, devuelve todos
 * los meses activos y los cambios vigentes sin exponer quién los hizo, y un
 * import que cubre dos meses no mezcla sus entradas (misma regla que
 * get_shared_view). Corre contra el stack local de Supabase (`npm run test:db`).
 */

import { afterAll, describe, expect, it } from 'vitest';
import { clienteAnon, clienteServicio, crearUsuarioAutenticado } from './helpers.ts';

// Nombres ficticios (ADR-0011).

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

async function noAdmin() {
  const u = await crearUsuarioAutenticado();
  usuariosDePrueba.push(u.email);
  return u.cliente;
}

async function publicarMes(
  cliente: Awaited<ReturnType<typeof admin>>,
  month: string,
  personKey: string,
  rawName: string,
  displayName: string,
  department: string,
  date: string,
  raw: string,
  hash: string,
) {
  const { data: importId, error } = await cliente.rpc('publish_import', {
    payload: {
      source: 'excel',
      source_label: 'prueba.xlsx',
      sheet_gid: null,
      content_hash: hash,
      summary: {},
      warnings: [],
      months: [
        {
          month,
          people: [{ key: personKey, raw_name: rawName, display_name: displayName, joined_on: null }],
          entries: [
            {
              person_key: personKey,
              date,
              department,
              raw,
              kind: 'work',
              start_min: 360,
              end_min: 900,
            },
          ],
        },
      ],
    },
  });
  if (error) throw error;
  return importId as string;
}

describe('get_admin_schedule: autorizacion', () => {
  it('anon no puede llamarla', async () => {
    const { error } = await clienteAnon().rpc('get_admin_schedule');
    expect(error).not.toBeNull();
  });

  it('un usuario autenticado que no es admin recibe un error', async () => {
    const cliente = await noAdmin();
    const { data, error } = await cliente.rpc('get_admin_schedule');
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it('un admin la puede llamar', async () => {
    const cliente = await admin();
    const { data, error } = await cliente.rpc('get_admin_schedule');
    expect(error).toBeNull();
    expect(data).toMatchObject({ months: expect.any(Array), overrides: expect.any(Array) });
  });
});

describe('get_admin_schedule: datos', () => {
  it('devuelve las personas y entradas de un mes publicado', async () => {
    const cliente = await admin();
    await publicarMes(
      cliente,
      '2026-11-01',
      'HUGO CESAR PINEDA',
      'PINEDA HUGO CESAR',
      'Hugo Cesar Pineda',
      'MEGA N1',
      '2026-11-01',
      '06:00-15:00',
      `hash-admin-${Date.now()}`,
    );

    const { data } = await cliente.rpc('get_admin_schedule');
    const vista = data as { months: { month: string; people: unknown[]; entries: unknown[] }[] };
    const mes = vista.months.find((m) => m.month === '2026-11-01');
    expect(mes?.people).toContainEqual({
      key: 'HUGO CESAR PINEDA',
      rawName: 'PINEDA HUGO CESAR',
      displayName: 'Hugo Cesar Pineda',
      joinedOn: null,
    });
  });

  it('un cambio de jefatura vigente aparece sin exponer quien lo hizo', async () => {
    const cliente = await admin();
    await publicarMes(
      cliente,
      '2026-11-01',
      'IRMA YOLANDA CASTRO',
      'CASTRO IRMA YOLANDA',
      'Irma Yolanda Castro',
      'MEGA N1',
      '2026-11-05',
      '06:00-15:00',
      `hash-cambio-admin-${Date.now()}`,
    );
    const { data: persona } = await cliente.from('people').select('id').eq('key', 'IRMA YOLANDA CASTRO').single();
    const { data: quienCrea } = await cliente.auth.getUser();
    await cliente.from('day_overrides').insert({
      person_id: persona?.['id'],
      date: '2026-11-05',
      kind: 'off',
      reason: 'Permiso',
      created_by: quienCrea.user?.id,
    });

    const { data } = await cliente.rpc('get_admin_schedule');
    const vista = data as { overrides: Record<string, unknown>[] };
    const cambio = vista.overrides.find(
      (o) => o['personKey'] === 'IRMA YOLANDA CASTRO' && o['date'] === '2026-11-05',
    );
    expect(cambio).toBeDefined();
    expect(cambio).not.toHaveProperty('createdBy');
    expect(cambio).not.toHaveProperty('created_by');
  });

  it('un import que cubre dos meses no mezcla las entradas de un mes con las del otro', async () => {
    const cliente = await admin();
    const hash = `hash-admin-dos-meses-${Date.now()}`;
    const { error } = await cliente.rpc('publish_import', {
      payload: {
        source: 'excel',
        source_label: 'prueba-admin-dos-meses.xlsx',
        sheet_gid: null,
        content_hash: hash,
        summary: {},
        warnings: [],
        months: [
          {
            month: '2026-04-01',
            people: [{ key: 'NOE SALVADOR RIVAS', raw_name: 'RIVAS NOE SALVADOR', display_name: 'Noe Salvador Rivas', joined_on: null }],
            entries: [
              { person_key: 'NOE SALVADOR RIVAS', date: '2026-04-01', department: 'MEGA N1', raw: '06:00-15:00', kind: 'work', start_min: 360, end_min: 900 },
            ],
          },
          {
            month: '2026-05-01',
            people: [{ key: 'NOE SALVADOR RIVAS', raw_name: 'RIVAS NOE SALVADOR', display_name: 'Noe Salvador Rivas', joined_on: null }],
            entries: [
              { person_key: 'NOE SALVADOR RIVAS', date: '2026-05-01', department: 'MEGA N2', raw: '15:00-23:00', kind: 'work', start_min: 900, end_min: 1380 },
            ],
          },
        ],
      },
    });
    expect(error).toBeNull();

    const { data } = await cliente.rpc('get_admin_schedule');
    const vista = data as { months: { month: string; entries: { date: string; department: string }[] }[] };
    const abril = vista.months.find((m) => m.month === '2026-04-01');
    const mayo = vista.months.find((m) => m.month === '2026-05-01');
    expect(abril?.entries).toEqual([{ date: '2026-04-01', department: 'MEGA N1', raw: '06:00-15:00', kind: 'work', startMin: 360, endMin: 900, personKey: 'NOE SALVADOR RIVAS' }]);
    expect(mayo?.entries).toEqual([{ date: '2026-05-01', department: 'MEGA N2', raw: '15:00-23:00', kind: 'work', startMin: 900, endMin: 1380, personKey: 'NOE SALVADOR RIVAS' }]);
  });
});
