-- Compartir completo (Fase 7) y endurecimiento del cambio de un día:
--   * valida en la base los cambios que antes solo validaba la interfaz;
--   * implementa los cinco alcances de get_shared_view;
--   * filtra fechas y personas antes de devolver datos al cliente.
-- Documentado en docs/features/compartir.md y docs/arquitectura/seguridad.md.

alter table public.day_overrides
  add constraint day_overrides_horario_valido check (
    (
      kind = 'work'
      and start_min between 0 and 1439
      and end_min > start_min
      and end_min <= start_min + 1440
    )
    or (
      kind in ('off', 'vacation')
      and start_min is null
      and end_min is null
    )
  ),
  add constraint day_overrides_motivo_valido check (
    reason in (
      'Cambio de turno',
      'Apoyo a otra sede',
      'Permiso',
      'Incapacidad',
      'Capacitación',
      'Otro'
    )
  ),
  add constraint day_overrides_sede_valida check (
    site is null or site in (
      'Megacentro',
      'Tuscania',
      'Phoenix Tower',
      'Atento',
      'Santa Ana',
      'San Miguel',
      'Activo Fijo'
    )
  );

create or replace function public.save_day_override(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person_id uuid;
  v_support_id uuid;
  v_date date;
  v_kind text;
  v_start integer;
  v_end integer;
  v_reason text;
  v_site text;
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;

  select id into v_person_id from public.people where key = payload ->> 'person_key';
  if v_person_id is null then
    raise exception 'PERSONA_DESCONOCIDA' using errcode = 'P0001';
  end if;

  if nullif(payload ->> 'support_person_key', '') is not null then
    select id into v_support_id
      from public.people
      where key = payload ->> 'support_person_key';
    if v_support_id is null then
      raise exception 'APOYO_DESCONOCIDO' using errcode = 'P0001';
    end if;
  end if;

  begin
    v_date := (payload ->> 'date')::date;
    v_start := nullif(payload ->> 'start_min', '')::integer;
    v_end := nullif(payload ->> 'end_min', '')::integer;
  exception when others then
    raise exception 'CAMBIO_INVALIDO' using errcode = '22023';
  end;

  v_kind := payload ->> 'kind';
  v_reason := payload ->> 'reason';
  v_site := nullif(payload ->> 'site', '');

  if v_date is null
    or v_kind not in ('work', 'off', 'vacation')
    or v_reason not in (
      'Cambio de turno',
      'Apoyo a otra sede',
      'Permiso',
      'Incapacidad',
      'Capacitación',
      'Otro'
    )
    or (
      v_kind = 'work'
      and (
        v_start is null
        or v_end is null
        or v_start not between 0 and 1439
        or v_end <= v_start
        or v_end > v_start + 1440
      )
    )
    or (v_kind in ('off', 'vacation') and (v_start is not null or v_end is not null))
    or (
      v_site is not null
      and v_site not in (
        'Megacentro',
        'Tuscania',
        'Phoenix Tower',
        'Atento',
        'Santa Ana',
        'San Miguel',
        'Activo Fijo'
      )
    )
  then
    raise exception 'CAMBIO_INVALIDO' using errcode = '22023';
  end if;

  update public.day_overrides
    set revoked_at = now(), revoked_by = auth.uid()
    where person_id = v_person_id and date = v_date and revoked_at is null;

  insert into public.day_overrides (
    person_id, date, kind, start_min, end_min, site, reason, note,
    support_person_id, conflict_key, created_by
  ) values (
    v_person_id,
    v_date,
    v_kind,
    v_start,
    v_end,
    v_site,
    v_reason,
    nullif(payload ->> 'note', ''),
    v_support_id,
    nullif(payload ->> 'conflict_key', ''),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.save_day_override(jsonb) from public, anon, authenticated;
grant execute on function public.save_day_override(jsonb) to authenticated;

create or replace function public.get_shared_view(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link record;
  v_start date;
  v_end date;
  v_person_keys text[];
  v_fixed_person text;
  v_fixed_date date;
  v_meses jsonb;
  v_cambios jsonb;
  v_fuente jsonb;
begin
  select * into v_link from public.share_links where slug = p_slug;

  if v_link is null or v_link.revoked_at is not null or v_link.expires_at <= now() then
    return jsonb_build_object('error', 'ENLACE_INACTIVO');
  end if;

  begin
    case v_link.scope
      when 'operacion' then
        null;
      when 'semana' then
        v_start := (v_link.params ->> 'start_date')::date;
        if extract(isodow from v_start) <> 1 then
          raise exception 'inicio de semana';
        end if;
        v_end := v_start + 6;
        if jsonb_typeof(v_link.params -> 'person_keys') = 'array' then
          select coalesce(array_agg(value), array[]::text[])
            into v_person_keys
            from jsonb_array_elements_text(v_link.params -> 'person_keys');
        end if;
      when 'dia' then
        v_fixed_date := (v_link.params ->> 'date')::date;
        v_start := v_fixed_date;
        v_end := v_fixed_date;
      when 'persona' then
        v_fixed_person := nullif(v_link.params ->> 'person_key', '');
        if v_fixed_person is null then
          raise exception 'parametro persona';
        end if;
      when 'cambio' then
        v_fixed_person := nullif(v_link.params ->> 'person_key', '');
        v_fixed_date := (v_link.params ->> 'date')::date;
        v_start := v_fixed_date;
        v_end := v_fixed_date;
        if v_fixed_person is null then
          raise exception 'parametro persona';
        end if;
      else
        raise exception 'alcance';
    end case;
  exception when others then
    return jsonb_build_object('error', 'ENLACE_INACTIVO');
  end;

  update public.share_links set last_opened_at = now() where id = v_link.id;

  select coalesce(jsonb_agg(mes order by mes ->> 'month'), '[]'::jsonb)
    into v_meses
    from (
      select jsonb_build_object(
        'month', to_char(mv.month, 'YYYY-MM-DD'),
        'dates', (
          select coalesce(
            jsonb_agg(distinct to_char(se.date, 'YYYY-MM-DD') order by to_char(se.date, 'YYYY-MM-DD')),
            '[]'::jsonb
          )
          from public.schedule_entries se
          join public.people p on p.id = se.person_id
          where se.import_id = mv.import_id
            and se.date >= mv.month and se.date < (mv.month + interval '1 month')
            and (v_start is null or se.date >= v_start)
            and (v_end is null or se.date <= v_end)
            and (v_person_keys is null or p.key = any(v_person_keys))
        ),
        'people', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'key', p.key,
            'rawName', p.last_raw_name,
            'displayName', p.display_name,
            'joinedOn', to_char(p.joined_on, 'YYYY-MM-DD')
          )), '[]'::jsonb)
          from (
            select distinct se.person_id
            from public.schedule_entries se
            join public.people fp on fp.id = se.person_id
            where se.import_id = mv.import_id
              and se.date >= mv.month and se.date < (mv.month + interval '1 month')
              and (v_start is null or se.date >= v_start)
              and (v_end is null or se.date <= v_end)
              and (v_person_keys is null or fp.key = any(v_person_keys))
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
            and (v_start is null or se.date >= v_start)
            and (v_end is null or se.date <= v_end)
            and (v_person_keys is null or p.key = any(v_person_keys))
        )
      ) as mes
      from public.month_versions mv
      where exists (
        select 1
        from public.schedule_entries se
        join public.people p on p.id = se.person_id
        where se.import_id = mv.import_id
          and se.date >= mv.month and se.date < (mv.month + interval '1 month')
          and (v_start is null or se.date >= v_start)
          and (v_end is null or se.date <= v_end)
          and (v_person_keys is null or p.key = any(v_person_keys))
      )
    ) meses_agregados;

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
    where o.revoked_at is null
      and (v_start is null or o.date >= v_start)
      and (v_end is null or o.date <= v_end)
      and (v_person_keys is null or p.key = any(v_person_keys));

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
    'params', v_link.params,
    'title', v_link.title,
    'source', v_fuente,
    'months', v_meses,
    'overrides', v_cambios
  );
end;
$$;

revoke all on function public.get_shared_view(text) from public;
grant execute on function public.get_shared_view(text) to anon, authenticated;

-- Cómo deshacerla:
--   1. Restaurar save_day_override desde 20261104210000_panel_conflictos.sql.
--   2. Restaurar get_shared_view desde 20261104180132_get_shared_view.sql.
--   3. alter table public.day_overrides
--        drop constraint day_overrides_horario_valido,
--        drop constraint day_overrides_motivo_valido,
--        drop constraint day_overrides_sede_valida;
