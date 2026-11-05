/**
 * Verifica `save_day_override` y `revoke_day_override`: solo admin, un solo
 * cambio vigente por persona y día (guardar uno nuevo revoca el anterior),
 * y deshacer revoca sin romper si ya no hay nada vigente. Corre contra el
 * stack local de Supabase (`npm run test:db`).
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

async function publicarPersona(
  cliente: Awaited<ReturnType<typeof admin>>,
  personKey: string,
  rawName: string,
  displayName: string,
  date: string,
  hash: string,
) {
  const month = `${date.slice(0, 7)}-01`;
  const { error } = await cliente.rpc('publish_import', {
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
            { person_key: personKey, date, department: 'MEGA N1', raw: '06:00-15:00', kind: 'work', start_min: 360, end_min: 900 },
          ],
        },
      ],
    },
  });
  if (error) throw error;
}

describe('save_day_override: autorizacion', () => {
  it('anon no puede llamarla', async () => {
    const { error } = await clienteAnon().rpc('save_day_override', {
      payload: { person_key: 'X', date: '2026-11-02', kind: 'off', reason: 'Permiso' },
    });
    expect(error).not.toBeNull();
  });

  it('un autenticado que no es admin recibe un error', async () => {
    const cliente = await noAdmin();
    const { error } = await cliente.rpc('save_day_override', {
      payload: { person_key: 'X', date: '2026-11-02', kind: 'off', reason: 'Permiso' },
    });
    expect(error).not.toBeNull();
  });
});

describe('save_day_override: datos', () => {
  it('crea un cambio y aparece como vigente', async () => {
    const cliente = await admin();
    await publicarPersona(cliente, 'OMAR DAVID RAMIREZ', 'RAMIREZ OMAR DAVID', 'Omar David Ramirez', '2026-11-02', `hash-ed-${Date.now()}`);

    const { data: id, error } = await cliente.rpc('save_day_override', {
      payload: {
        person_key: 'OMAR DAVID RAMIREZ',
        date: '2026-11-02',
        kind: 'off',
        reason: 'Permiso',
        note: 'Cita médica',
      },
    });
    expect(error).toBeNull();
    expect(id).not.toBeNull();

    const { data: fila } = await cliente.from('day_overrides').select('*').eq('id', id as string).single();
    expect(fila).toMatchObject({ kind: 'off', reason: 'Permiso', note: 'Cita médica', revoked_at: null });
  });

  it('guardar un segundo cambio el mismo día revoca el primero', async () => {
    const cliente = await admin();
    await publicarPersona(cliente, 'YESENIA MARLENE TOBAR', 'TOBAR YESENIA MARLENE', 'Yesenia Marlene Tobar', '2026-11-03', `hash-ed2-${Date.now()}`);

    const { data: id1 } = await cliente.rpc('save_day_override', {
      payload: { person_key: 'YESENIA MARLENE TOBAR', date: '2026-11-03', kind: 'off', reason: 'Permiso' },
    });
    const { data: id2 } = await cliente.rpc('save_day_override', {
      payload: { person_key: 'YESENIA MARLENE TOBAR', date: '2026-11-03', kind: 'vacation', reason: 'Otro' },
    });
    expect(id2).not.toBe(id1);

    const { data: filas } = await cliente
      .from('day_overrides')
      .select('id, kind, revoked_at')
      .in('id', [id1 as string, id2 as string]);
    const anterior = filas?.find((f) => f.id === id1);
    const nuevo = filas?.find((f) => f.id === id2);
    expect(anterior?.revoked_at).not.toBeNull();
    expect(nuevo?.kind).toBe('vacation');
    expect(nuevo?.revoked_at).toBeNull();
  });

  it('get_admin_schedule solo muestra el cambio vigente, no el revocado', async () => {
    const cliente = await admin();
    await publicarPersona(cliente, 'RIGOBERTO ANTONIO LUNA', 'LUNA RIGOBERTO ANTONIO', 'Rigoberto Antonio Luna', '2026-11-04', `hash-ed3-${Date.now()}`);
    await cliente.rpc('save_day_override', {
      payload: { person_key: 'RIGOBERTO ANTONIO LUNA', date: '2026-11-04', kind: 'off', reason: 'Permiso' },
    });
    await cliente.rpc('save_day_override', {
      payload: { person_key: 'RIGOBERTO ANTONIO LUNA', date: '2026-11-04', kind: 'vacation', reason: 'Otro' },
    });

    const { data } = await cliente.rpc('get_admin_schedule');
    const vista = data as { overrides: { personKey: string; date: string; kind: string }[] };
    const delDia = vista.overrides.filter((o) => o.personKey === 'RIGOBERTO ANTONIO LUNA' && o.date === '2026-11-04');
    expect(delDia).toHaveLength(1);
    expect(delDia[0]?.kind).toBe('vacation');
  });
});

describe('revoke_day_override', () => {
  it('revoca el cambio vigente', async () => {
    const cliente = await admin();
    await publicarPersona(cliente, 'FLOR DE MARIA SOLIS', 'SOLIS FLOR DE MARIA', 'Flor de Maria Solis', '2026-11-05', `hash-ed4-${Date.now()}`);
    const { data: id } = await cliente.rpc('save_day_override', {
      payload: { person_key: 'FLOR DE MARIA SOLIS', date: '2026-11-05', kind: 'off', reason: 'Permiso' },
    });

    const { error } = await cliente.rpc('revoke_day_override', { p_person_key: 'FLOR DE MARIA SOLIS', p_date: '2026-11-05' });
    expect(error).toBeNull();

    const { data: fila } = await cliente.from('day_overrides').select('revoked_at').eq('id', id as string).single();
    expect(fila?.revoked_at).not.toBeNull();
  });

  it('no falla si ya no hay nada vigente que deshacer', async () => {
    const cliente = await admin();
    const { error } = await cliente.rpc('revoke_day_override', { p_person_key: 'NO EXISTE', p_date: '2026-11-05' });
    expect(error).toBeNull();
  });

  it('anon no puede llamarla', async () => {
    const { error } = await clienteAnon().rpc('revoke_day_override', { p_person_key: 'X', p_date: '2026-11-05' });
    expect(error).not.toBeNull();
  });
});
