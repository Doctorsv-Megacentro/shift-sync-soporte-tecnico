/**
 * Verifica `get_shared_view`: un slug inválido, vencido o revocado da el
 * mismo error; uno vigente devuelve personas, entradas y cambios del
 * alcance «operación» sin exponer quién hizo un cambio. Corre contra el
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

/** Publica un mes mínimo con una persona y una entrada, y lo devuelve. */
async function publicarMesDePrueba(cliente: Awaited<ReturnType<typeof admin>>, month: string, hash: string) {
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
          people: [
            { key: 'SOFIA ELENA MOLINA', raw_name: 'MOLINA SOFIA ELENA', display_name: 'Sofia Elena Molina', joined_on: null },
          ],
          entries: [
            {
              person_key: 'SOFIA ELENA MOLINA',
              date: month,
              department: 'MEGA N1',
              raw: '06:00-15:00',
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

async function publicarMesParaAlcance(
  cliente: Awaited<ReturnType<typeof admin>>,
  month: string,
  sufijo: string,
) {
  const personaA = `ALBA ${sufijo}`;
  const personaB = `BRUNO ${sufijo}`;
  const dia1 = month;
  const dia2 = `${month.slice(0, 8)}02`;
  const dia8 = `${month.slice(0, 8)}08`;
  const { error } = await cliente.rpc('publish_import', {
    payload: {
      source: 'excel',
      source_label: 'alcances.xlsx',
      sheet_gid: null,
      content_hash: `hash-alcance-${sufijo}-${Date.now()}`,
      summary: {},
      warnings: [],
      months: [
        {
          month,
          people: [
            { key: personaA, raw_name: personaA, display_name: `Alba ${sufijo}`, joined_on: null },
            { key: personaB, raw_name: personaB, display_name: `Bruno ${sufijo}`, joined_on: null },
          ],
          entries: [
            { person_key: personaA, date: dia1, department: 'MEGA N1', raw: '06:00-15:00', kind: 'work', start_min: 360, end_min: 900 },
            { person_key: personaA, date: dia8, department: 'MEGA N1', raw: 'Libre', kind: 'off', start_min: null, end_min: null },
            { person_key: personaB, date: dia2, department: 'MEGA N2', raw: '15:00-23:00', kind: 'work', start_min: 900, end_min: 1380 },
          ],
        },
      ],
    },
  });
  if (error) throw error;
  return { personaA, personaB, dia1, dia2, dia8 };
}

async function crearEnlace(
  cliente: Awaited<ReturnType<typeof admin>>,
  opts: {
    expiresAt: string;
    revokedAt?: string | null;
    scope?: 'operacion' | 'semana' | 'dia' | 'persona' | 'cambio';
    params?: Record<string, unknown>;
  },
) {
  const slug = `prueba-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { data: quienCrea } = await cliente.auth.getUser();
  const { error } = await cliente.from('share_links').insert({
    slug,
    scope: opts.scope ?? 'operacion',
    params: opts.params ?? {},
    expires_at: opts.expiresAt,
    revoked_at: opts.revokedAt ?? null,
    created_by: quienCrea.user?.id,
  });
  if (error) throw error;
  return slug;
}

describe('get_shared_view: enlaces inválidos', () => {
  it('un slug que no existe da ENLACE_INACTIVO', async () => {
    const { data, error } = await clienteAnon().rpc('get_shared_view', { p_slug: 'no-existe-123456789012' });
    expect(error).toBeNull();
    expect(data).toEqual({ error: 'ENLACE_INACTIVO' });
  });

  it('un slug vencido da ENLACE_INACTIVO', async () => {
    const cliente = await admin();
    const slug = await crearEnlace(cliente, { expiresAt: '2020-01-01T00:00:00Z' });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    expect(data).toEqual({ error: 'ENLACE_INACTIVO' });
  });

  it('un slug revocado da ENLACE_INACTIVO aunque no haya vencido', async () => {
    const cliente = await admin();
    const slug = await crearEnlace(cliente, {
      expiresAt: '2030-01-01T00:00:00Z',
      revokedAt: new Date().toISOString(),
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    expect(data).toEqual({ error: 'ENLACE_INACTIVO' });
  });

  it('anon no puede leer share_links directamente para adivinar un slug', async () => {
    const { data, error } = await clienteAnon().from('share_links').select('*');
    expect(error === null ? data : []).toEqual([]);
  });

  // Encontrado probando en el navegador: un admin con sesión en una pestaña
  // y el enlace abierto en otra comparten localStorage (mismo origen), así
  // que la pestaña del enlace llama como `authenticated`, no `anon`. La
  // función debe funcionar igual para ambos roles (no distingue por quién
  // llama, todo el control está en el slug).
  it('un usuario con sesión también puede abrir el enlace, no solo anon', async () => {
    const cliente = await admin();
    const slug = await crearEnlace(cliente, { expiresAt: '2030-01-01T00:00:00Z' });

    const { data, error } = await cliente.rpc('get_shared_view', { p_slug: slug });
    expect(error).toBeNull();
    expect(data).toMatchObject({ scope: 'operacion' });
  });
});

describe('get_shared_view: un enlace vigente', () => {
  it('devuelve personas y entradas del mes activo', async () => {
    const cliente = await admin();
    await publicarMesDePrueba(cliente, '2026-11-01', `hash-vista-${Date.now()}`);
    const slug = await crearEnlace(cliente, { expiresAt: '2030-01-01T00:00:00Z' });

    const { data, error } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    expect(error).toBeNull();

    const vista = data as {
      scope: string;
      source: { source: string; sourceLabel: string; importedAt: string } | null;
      months: { month: string; people: unknown[]; entries: unknown[] }[];
    };
    expect(vista.scope).toBe('operacion');
    expect(vista.source).toMatchObject({ source: 'excel', sourceLabel: 'prueba.xlsx' });
    const mes = vista.months.find((m) => m.month === '2026-11-01');
    expect(mes?.people).toContainEqual({
      key: 'SOFIA ELENA MOLINA',
      rawName: 'MOLINA SOFIA ELENA',
      displayName: 'Sofia Elena Molina',
      joinedOn: null,
    });
    expect(mes?.entries).toContainEqual({
      personKey: 'SOFIA ELENA MOLINA',
      date: '2026-11-01',
      department: 'MEGA N1',
      raw: '06:00-15:00',
      kind: 'work',
      startMin: 360,
      endMin: 900,
    });
  });

  it('actualiza last_opened_at al abrirlo', async () => {
    const cliente = await admin();
    const slug = await crearEnlace(cliente, { expiresAt: '2030-01-01T00:00:00Z' });

    await clienteAnon().rpc('get_shared_view', { p_slug: slug });

    const { data: fila } = await cliente.from('share_links').select('last_opened_at').eq('slug', slug).single();
    expect(fila?.['last_opened_at']).not.toBeNull();
  });

  // Encontrado probando con la hoja real anonimizada: un solo import puede
  // cubrir dos meses calendario a la vez (p. ej. octubre y noviembre en una
  // misma carga), y antes filtraba solo por import_id, así que cada bloque
  // de mes devolvía TODAS las entradas del import, duplicadas en los dos
  // meses. Debe filtrar también por fecha dentro del mes de cada versión.
  it('un import que cubre dos meses no mezcla las entradas de un mes con las del otro', async () => {
    const cliente = await admin();
    const hash = `hash-dos-meses-${Date.now()}`;
    const { error } = await cliente.rpc('publish_import', {
      payload: {
        source: 'excel',
        source_label: 'prueba-dos-meses.xlsx',
        sheet_gid: null,
        content_hash: hash,
        summary: {},
        warnings: [],
        months: [
          {
            month: '2026-02-01',
            people: [{ key: 'SOFIA ELENA MOLINA', raw_name: 'MOLINA SOFIA ELENA', display_name: 'Sofia Elena Molina', joined_on: null }],
            entries: [
              { person_key: 'SOFIA ELENA MOLINA', date: '2026-02-01', department: 'MEGA N1', raw: '06:00-15:00', kind: 'work', start_min: 360, end_min: 900 },
            ],
          },
          {
            month: '2026-03-01',
            people: [{ key: 'SOFIA ELENA MOLINA', raw_name: 'MOLINA SOFIA ELENA', display_name: 'Sofia Elena Molina', joined_on: null }],
            entries: [
              { person_key: 'SOFIA ELENA MOLINA', date: '2026-03-01', department: 'MEGA N2', raw: '15:00-23:00', kind: 'work', start_min: 900, end_min: 1380 },
            ],
          },
        ],
      },
    });
    expect(error).toBeNull();

    const slug = await crearEnlace(cliente, { expiresAt: '2030-01-01T00:00:00Z' });
    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { months: { month: string; entries: { date: string; department: string }[] }[] };

    const febrero = vista.months.find((m) => m.month === '2026-02-01');
    const marzo = vista.months.find((m) => m.month === '2026-03-01');
    expect(febrero?.entries).toEqual([{ date: '2026-02-01', department: 'MEGA N1', raw: '06:00-15:00', kind: 'work', startMin: 360, endMin: 900, personKey: 'SOFIA ELENA MOLINA' }]);
    expect(marzo?.entries).toEqual([{ date: '2026-03-01', department: 'MEGA N2', raw: '15:00-23:00', kind: 'work', startMin: 900, endMin: 1380, personKey: 'SOFIA ELENA MOLINA' }]);
  });
});

describe('get_shared_view: alcances de la Fase 7', () => {
  it('semana limita siete días y las personas de los filtros', async () => {
    const cliente = await admin();
    const datos = await publicarMesParaAlcance(cliente, '2027-01-01', 'ENERO');
    const slug = await crearEnlace(cliente, {
      expiresAt: '2030-01-01T00:00:00Z',
      scope: 'semana',
      params: { start_date: '2026-12-28', person_keys: [datos.personaA], site: 'Megacentro', role: 'N1' },
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { params: Record<string, unknown>; months: { entries: { personKey: string; date: string }[] }[] };
    expect(vista.params).toMatchObject({ start_date: '2026-12-28', site: 'Megacentro', role: 'N1' });
    expect(vista.months.flatMap((m) => m.entries)).toEqual([
      expect.objectContaining({ personKey: datos.personaA, date: datos.dia1 }),
    ]);
  });

  it('día devuelve únicamente la fecha elegida', async () => {
    const cliente = await admin();
    const datos = await publicarMesParaAlcance(cliente, '2027-02-01', 'FEBRERO');
    const slug = await crearEnlace(cliente, {
      expiresAt: '2030-01-01T00:00:00Z',
      scope: 'dia',
      params: { date: datos.dia2 },
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { months: { dates: string[]; entries: { personKey: string; date: string }[] }[] };
    expect(vista.months.flatMap((m) => m.dates)).toEqual([datos.dia2]);
    expect(vista.months.flatMap((m) => m.entries)).toEqual([
      expect.objectContaining({ personKey: datos.personaB, date: datos.dia2 }),
    ]);
  });

  it('persona conserva la operación para «Quién está» y fija la persona en params', async () => {
    const cliente = await admin();
    const datos = await publicarMesParaAlcance(cliente, '2027-03-01', 'MARZO');
    const slug = await crearEnlace(cliente, {
      expiresAt: '2030-01-01T00:00:00Z',
      scope: 'persona',
      params: { person_key: datos.personaA },
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { params: { person_key: string }; months: { entries: { personKey: string }[] }[] };
    expect(vista.params.person_key).toBe(datos.personaA);
    const personasVisibles = new Set(vista.months.flatMap((m) => m.entries.map((e) => e.personKey)));
    expect(personasVisibles.has(datos.personaA)).toBe(true);
    expect(personasVisibles.has(datos.personaB)).toBe(true);
  });

  it('cambio fija persona y fecha y solo devuelve ese día', async () => {
    const cliente = await admin();
    const datos = await publicarMesParaAlcance(cliente, '2027-04-01', 'ABRIL');
    const slug = await crearEnlace(cliente, {
      expiresAt: '2030-01-01T00:00:00Z',
      scope: 'cambio',
      params: { person_key: datos.personaA, date: datos.dia1 },
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { params: { person_key: string; date: string }; months: { dates: string[] }[] };
    expect(vista.params).toEqual({ person_key: datos.personaA, date: datos.dia1 });
    expect(vista.months.flatMap((m) => m.dates)).toEqual([datos.dia1]);
  });
});

describe('get_shared_view: cambios de jefatura', () => {
  it('muestra un cambio vigente sin exponer quién lo hizo', async () => {
    const cliente = await admin();
    await publicarMesDePrueba(cliente, '2026-11-01', `hash-cambio-${Date.now()}`);
    const slug = await crearEnlace(cliente, { expiresAt: '2030-01-01T00:00:00Z' });

    const { data: persona } = await cliente.from('people').select('id').eq('key', 'SOFIA ELENA MOLINA').single();
    const { data: quienCrea } = await cliente.auth.getUser();

    await cliente.from('day_overrides').insert({
      person_id: persona?.['id'],
      date: '2026-11-01',
      kind: 'work',
      start_min: 840,
      end_min: 1380,
      reason: 'Cambio de turno',
      note: 'Refuerzo para la cobertura de la tarde.',
      created_by: quienCrea.user?.id,
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { overrides: Record<string, unknown>[] };

    const cambio = vista.overrides.find(
      (o) => o['personKey'] === 'SOFIA ELENA MOLINA' && o['date'] === '2026-11-01',
    );
    expect(cambio).toBeDefined();
    expect(cambio).toMatchObject({
      personKey: 'SOFIA ELENA MOLINA',
      date: '2026-11-01',
      kind: 'work',
      startMin: 840,
      endMin: 1380,
      reason: 'Cambio de turno',
      note: 'Refuerzo para la cobertura de la tarde.',
    });
    // Lo esencial del plan §5.6: nunca quién lo hizo.
    expect(cambio).not.toHaveProperty('createdBy');
    expect(cambio).not.toHaveProperty('created_by');
    expect(JSON.stringify(cambio)).not.toContain(quienCrea.user?.id ?? '__nunca__');
  });

  it('un cambio deshecho (revocado) no aparece', async () => {
    // get_shared_view devuelve TODOS los cambios vigentes de la operación,
    // no solo los de un mes: por eso esta prueba usa un mes y una fecha
    // propios (diciembre), para no depender de si otra prueba de este mismo
    // archivo dejó un cambio vigente en noviembre.
    const cliente = await admin();
    await publicarMesDePrueba(cliente, '2026-12-01', `hash-revocado-${Date.now()}`);
    const slug = await crearEnlace(cliente, { expiresAt: '2030-01-01T00:00:00Z' });

    const { data: persona } = await cliente.from('people').select('id').eq('key', 'SOFIA ELENA MOLINA').single();
    const { data: quienCrea } = await cliente.auth.getUser();

    await cliente.from('day_overrides').insert({
      person_id: persona?.['id'],
      date: '2026-12-01',
      kind: 'off',
      reason: 'Permiso',
      created_by: quienCrea.user?.id,
      revoked_at: new Date().toISOString(),
    });

    const { data } = await clienteAnon().rpc('get_shared_view', { p_slug: slug });
    const vista = data as { overrides: { personKey: string; date: string }[] };
    const elRevocado = vista.overrides.find(
      (o) => o.personKey === 'SOFIA ELENA MOLINA' && o.date === '2026-12-01',
    );
    expect(elRevocado).toBeUndefined();
  });
});
