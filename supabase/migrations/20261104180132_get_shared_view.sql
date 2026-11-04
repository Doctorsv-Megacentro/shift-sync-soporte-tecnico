-- get_shared_view: la única vía de lectura pública (anon). Fase 3, alcance
-- «toda la operación» únicamente; `semana`/`dia`/`persona`/`cambio` llegan
-- en la Fase 7. Documentado en docs/arquitectura/modelo-de-datos.md y
-- docs/features/empleado.md. Decisiones: ADR-0003, ADR-0006.
--
-- Cómo deshacerla:
--   drop function if exists public.get_shared_view(text);

create function public.get_shared_view(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link record;
  v_meses jsonb;
  v_cambios jsonb;
  v_fuente jsonb;
begin
  select * into v_link from public.share_links where slug = p_slug;

  -- Un slug que no existe, vencido o revocado dan el mismo mensaje: no se
  -- distingue el motivo para no dar pistas a quien prueba slugs al azar.
  if v_link is null or v_link.revoked_at is not null or v_link.expires_at <= now() then
    return jsonb_build_object('error', 'ENLACE_INACTIVO');
  end if;

  update public.share_links set last_opened_at = now() where id = v_link.id;

  -- Fase 3: el único alcance implementado es «toda la operación». Los demás
  -- (semana/dia/persona/cambio) devuelven el mismo error hasta la Fase 7,
  -- en vez de fingir un alcance que todavía no filtra nada.
  if v_link.scope <> 'operacion' then
    return jsonb_build_object('error', 'ALCANCE_NO_DISPONIBLE');
  end if;

  -- Un mes por cada versión activa, con sus personas y sus entradas. Un
  -- mismo import puede cubrir varios meses calendario (p. ej. una hoja con
  -- octubre y noviembre activada de una vez), así que cada bloque filtra
  -- también por fecha dentro de mv.month: filtrar solo por import_id
  -- duplicaría todas las entradas del import en cada mes que lo comparte.
  select coalesce(jsonb_agg(mes order by mes ->> 'month'), '[]'::jsonb)
    into v_meses
    from (
      select jsonb_build_object(
        'month', to_char(mv.month, 'YYYY-MM-DD'),
        'dates', (
          select coalesce(jsonb_agg(distinct to_char(se.date, 'YYYY-MM-DD') order by to_char(se.date, 'YYYY-MM-DD')), '[]'::jsonb)
          from public.schedule_entries se
          where se.import_id = mv.import_id
            and se.date >= mv.month and se.date < (mv.month + interval '1 month')
        ),
        'people', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'key', p.key,
            'rawName', p.last_raw_name,
            'displayName', p.display_name,
            'joinedOn', to_char(p.joined_on, 'YYYY-MM-DD')
          )), '[]'::jsonb)
          from (
            select distinct person_id
            from public.schedule_entries
            where import_id = mv.import_id
              and date >= mv.month and date < (mv.month + interval '1 month')
          ) ids
          join public.people p on p.id = ids.person_id
        ),
        'entries', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'personKey', p.key,
            'date', to_char(se.date, 'YYYY-MM-DD'),
            'department', se.department,
            'raw', se.raw,
            'kind', se.kind,
            'startMin', se.start_min,
            'endMin', se.end_min
          )), '[]'::jsonb)
          from public.schedule_entries se
          join public.people p on p.id = se.person_id
          where se.import_id = mv.import_id
            and se.date >= mv.month and se.date < (mv.month + interval '1 month')
        )
      ) as mes
      from public.month_versions mv
    ) meses_agregados;

  -- Cambios de jefatura vigentes. Nunca created_by ni revoked_by: quien abre
  -- el enlace sabe qué cambió y por qué, no quién lo hizo (plan §5.6).
  select coalesce(jsonb_agg(jsonb_build_object(
      'personKey', p.key,
      'date', to_char(o.date, 'YYYY-MM-DD'),
      'kind', o.kind,
      'startMin', o.start_min,
      'endMin', o.end_min,
      'site', o.site,
      'reason', o.reason,
      'note', o.note,
      'supportPersonKey', sp.key,
      'createdAt', to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )), '[]'::jsonb)
    into v_cambios
    from public.day_overrides o
    join public.people p on p.id = o.person_id
    left join public.people sp on sp.id = o.support_person_id
    where o.revoked_at is null;

  -- Para la barra superior («Excel · cargado el …» o «Google Sheet ·
  -- actualizado hace…»): el origen de la versión activada más reciente
  -- entre los meses incluidos.
  select jsonb_build_object(
      'source', i.source,
      'sourceLabel', i.source_label,
      'importedAt', to_char(i.imported_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
    into v_fuente
    from public.month_versions mv
    join public.imports i on i.id = mv.import_id
    order by mv.activated_at desc
    limit 1;

  return jsonb_build_object(
    'scope', v_link.scope,
    'title', v_link.title,
    'source', v_fuente,
    'months', v_meses,
    'overrides', v_cambios
  );
end;
$$;

-- A diferencia de is_admin/publish_import/activate_import, esta función SÍ
-- la llama anon: es la única puerta de lectura pública (plan §12). También
-- se deja a authenticated: la función no distingue quién llama (todo el
-- control está en el slug), y jefatura con sesión abierta en una pestaña
-- puede abrir su propio enlace en otra sin que la bloquee un permiso.
revoke all on function public.get_shared_view(text) from public;
grant execute on function public.get_shared_view(text) to anon, authenticated;
