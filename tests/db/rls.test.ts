/**
 * Verifica la garantía de seguridad central del plan: `anon` no lee ninguna
 * tabla directamente, y escribir requiere ser jefatura. Corre contra el
 * stack local de Supabase (`npm run test:db`, requiere `supabase start`).
 * Documentado en docs/arquitectura/seguridad.md.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { TABLAS_SOLO_ADMIN, clienteAnon, clienteServicio, crearUsuarioAutenticado } from './helpers.ts';

const usuariosDePrueba: string[] = [];

afterAll(async () => {
  // Limpieza: el stack local se reinicia con `supabase db reset`, pero dejar
  // esto explícito ayuda si las pruebas se corren varias veces seguidas.
  const servicio = clienteServicio();
  for (const email of usuariosDePrueba) {
    const { data } = await servicio.auth.admin.listUsers();
    const usuario = data.users.find((u) => u.email === email);
    if (usuario) await servicio.auth.admin.deleteUser(usuario.id);
  }
});

describe('anon no lee ninguna tabla directamente', () => {
  const anon = clienteAnon();

  for (const tabla of TABLAS_SOLO_ADMIN) {
    it(`"${tabla}" devuelve vacío para anon`, async () => {
      const { data, error } = await anon.from(tabla).select('*');
      // RLS sin política para anon filtra todas las filas: la propiedad que
      // importa es que no llega ningún dato, haya o no un error explícito.
      expect(error === null ? data : []).toEqual([]);
    });
  }
});

describe('anon no puede escribir en ninguna tabla', () => {
  const anon = clienteAnon();

  it('no puede insertar en admins', async () => {
    const { error } = await anon.from('admins').insert({ email: 'intruso@ejemplo.com' });
    expect(error).not.toBeNull();
  });

  it('no puede insertar en day_overrides', async () => {
    const { error } = await anon.from('day_overrides').insert({
      person_id: '00000000-0000-0000-0000-000000000000',
      date: '2026-11-02',
      kind: 'off',
      reason: 'Cambio de turno',
      created_by: '00000000-0000-0000-0000-000000000000',
    });
    expect(error).not.toBeNull();
  });
});

describe('is_admin()', () => {
  it('es falso para un usuario autenticado que no está en admins', async () => {
    const { email, cliente } = await crearUsuarioAutenticado();
    usuariosDePrueba.push(email);

    const { data, error } = await cliente.rpc('is_admin');
    expect(error).toBeNull();
    expect(data).toBe(false);
  });

  it('es cierto para un usuario que sí está en admins', async () => {
    const { email, cliente } = await crearUsuarioAutenticado({ admin: true });
    usuariosDePrueba.push(email);

    const { data, error } = await cliente.rpc('is_admin');
    expect(error).toBeNull();
    expect(data).toBe(true);
  });

  it('anon no tiene permiso ni para llamar a la función', async () => {
    const anon = clienteAnon();
    const { error } = await anon.rpc('is_admin');
    expect(error).not.toBeNull();
  });
});

describe('publish_import: solo jefatura', () => {
  const payloadMinimo = {
    source: 'excel',
    source_label: 'prueba.xlsx',
    sheet_gid: null,
    content_hash: 'hash-de-prueba',
    summary: {},
    warnings: [],
    months: [{ month: '2026-11-01', people: [], entries: [] }],
  };

  it('un usuario autenticado que no es admin no puede publicar', async () => {
    const { email, cliente } = await crearUsuarioAutenticado();
    usuariosDePrueba.push(email);

    const { error } = await cliente.rpc('publish_import', { payload: payloadMinimo });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/ADMIN_REQUERIDO/);
  });

  it('anon no puede publicar', async () => {
    const anon = clienteAnon();
    const { error } = await anon.rpc('publish_import', { payload: payloadMinimo });
    expect(error).not.toBeNull();
  });

  it('un admin sí puede publicar, y el import queda asociado a su usuario', async () => {
    const { email, cliente } = await crearUsuarioAutenticado({ admin: true });
    usuariosDePrueba.push(email);

    const { data: importId, error } = await cliente.rpc('publish_import', {
      payload: { ...payloadMinimo, content_hash: `hash-admin-${Date.now()}` },
    });
    expect(error).toBeNull();
    expect(importId).toMatch(/^[0-9a-f-]{36}$/);

    // Lo puede leer de vuelta, porque ahora actúa como admin con RLS a favor.
    const { data: fila } = await cliente.from('imports').select('id').eq('id', importId).single();
    expect(fila?.id).toBe(importId);
  });
});
