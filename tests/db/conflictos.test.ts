/**
 * Panel de jefatura: aceptar un conflicto, guardar la clave en el cambio de un
 * día, y fijar el nombre visible. Ficha: docs/features/panel.md.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { clienteAnon, clienteServicio, crearUsuarioAutenticado } from './helpers.ts';

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

async function publicarPersona(cliente: Awaited<ReturnType<typeof admin>>, personKey: string) {
  const { error } = await cliente.rpc('publish_import', {
    payload: {
      source: 'excel',
      source_label: 'panel.xlsx',
      sheet_gid: null,
      content_hash: `hash-panel-${personKey}-${Date.now()}`,
      summary: {},
      warnings: [],
      months: [
        {
          month: '2026-11-01',
          people: [
            {
              key: personKey,
              raw_name: 'PEREZ ANA',
              display_name: 'Perez Ana',
              joined_on: null,
            },
          ],
          entries: [
            {
              person_key: personKey,
              date: '2026-11-02',
              department: 'Soporte N1',
              raw: 'Libre',
              kind: 'off',
              start_min: null,
              end_min: null,
            },
          ],
        },
      ],
    },
  });
  if (error) throw error;
}

describe('conflictos de jefatura', () => {
  it('anon y un autenticado sin acceso no pueden aceptar un conflicto', async () => {
    const { error: errorAnon } = await clienteAnon().rpc('ack_conflict', { p_key: 'fecha-en-nombre:x:2026-11-01', p_note: null });
    expect(errorAnon).not.toBeNull();

    const cliente = await noAdmin();
    const { error } = await cliente.rpc('ack_conflict', { p_key: 'fecha-en-nombre:x:2026-11-01', p_note: 'visto' });
    expect(error).not.toBeNull();
  });

  it('un admin acepta y luego deshace; get_admin_schedule devuelve el ack vigente', async () => {
    const cliente = await admin();
    const clave = `fecha-en-nombre:panel:${Date.now()}`;

    const aceptado = await cliente.rpc('ack_conflict', { p_key: clave, p_note: 'visto' });
    expect(aceptado.error).toBeNull();

    const horario = await cliente.rpc('get_admin_schedule');
    expect(horario.error).toBeNull();
    const acks = (horario.data as { acks: { conflictKey: string; note: string | null }[] }).acks;
    expect(acks.some((ack) => ack.conflictKey === clave && ack.note === 'visto')).toBe(true);

    const quitado = await cliente.rpc('revoke_conflict_ack', { p_key: clave });
    expect(quitado.error).toBeNull();

    const despues = await cliente.rpc('get_admin_schedule');
    const acksDespues = (despues.data as { acks: { conflictKey: string }[] }).acks;
    expect(acksDespues.some((ack) => ack.conflictKey === clave)).toBe(false);
  });

  it('guarda la clave del conflicto en el cambio del día', async () => {
    const cliente = await admin();
    const persona = `PANEL-${Date.now()}`;
    await publicarPersona(cliente, persona);

    const guardado = await cliente.rpc('save_day_override', {
      payload: {
        person_key: persona,
        date: '2026-11-02',
        kind: 'work',
        start_min: 840,
        end_min: 1080,
        site: 'Tuscania',
        reason: 'Apoyo a otra sede',
        note: null,
        support_person_key: null,
        conflict_key: 'cobertura-supervision:tuscania:2026-11-02:14:00-18:00',
      },
    });
    expect(guardado.error).toBeNull();

    const horario = await cliente.rpc('get_admin_schedule');
    const overrides = (horario.data as { overrides: { personKey: string; conflictKey: string | null }[] }).overrides;
    expect(overrides.some((o) => o.personKey === persona && o.conflictKey === 'cobertura-supervision:tuscania:2026-11-02:14:00-18:00')).toBe(true);
  });

  it('fija el nombre visible y rechaza uno vacío o una persona que no existe', async () => {
    const cliente = await admin();
    const persona = `PANEL-NOMBRE-${Date.now()}`;
    await publicarPersona(cliente, persona);

    const vacio = await cliente.rpc('set_person_display_name', { p_key: persona, p_name: '   ' });
    expect(vacio.error?.message ?? '').toContain('NOMBRE_VACIO');

    const desconocida = await cliente.rpc('set_person_display_name', { p_key: 'NADIE', p_name: 'Nadie' });
    expect(desconocida.error?.message ?? '').toContain('PERSONA_DESCONOCIDA');

    const guardado = await cliente.rpc('set_person_display_name', { p_key: persona, p_name: 'Ana Perez' });
    expect(guardado.error).toBeNull();

    const horario = await cliente.rpc('get_admin_schedule');
    const months = (horario.data as { months: { people: { key: string; displayName: string; displayNameSource: string }[] }[] }).months;
    const fila = months.flatMap((mes) => mes.people).find((p) => p.key === persona);
    expect(fila?.displayName).toBe('Ana Perez');
    expect(fila?.displayNameSource).toBe('manual');
  });
});
