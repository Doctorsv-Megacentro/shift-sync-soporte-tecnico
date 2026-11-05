-- Panel de conflictos (Fase 6, ADR-0007):
--   * save_day_override guarda conflict_key, para que resolver una cobertura
--     quede asociado a la regla que cerró.
--   * get_admin_schedule devuelve ese conflict_key, el origen del nombre
--     (auto | manual) y los acks vigentes.
--   * ack_conflict / revoke_conflict_ack: «aceptar como está» y deshacerlo.
--   * set_person_display_name: chips de orden del nombre.
--
-- Cómo deshacerla:
--   drop function if exists public.set_person_display_name(text, text);
--   drop function if exists public.revoke_conflict_ack(text);
--   drop function if exists public.ack_conflict(text, text);
--   -- y volver a crear save_day_override y get_admin_schedule como en
--   -- 20261104200000_cambiar_un_dia.sql y 20261104190000_get_admin_schedule.sql
--   -- (sin conflict_key, sin acks y sin displayNameSource).

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
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;

  select id into v_person_id from public.people where key = payload ->> 'person_key';
  if v_person_id is null then
    raise exception 'PERSONA_DESCONOCIDA' using errcode = 'P0001';
  end if;

  if payload ->> 'support_person_key' is not null then
    select id into v_support_id from public.people where key = payload ->> 'support_person_key';
  end if;

  v_date := (payload ->> 'date')::date;

  update public.day_overrides
    set revoked_at = now(), revoked_by = auth.uid()
    where person_id = v_person_id and date = v_date and revoked_at is null;

  insert into public.day_overrides (
    person_id, date, kind, start_min, end_min, site, reason, note,
    support_person_id, conflict_key, created_by
  ) values (
    v_person_id,
    v_date,
    payload ->> 'kind',
    nullif(payload ->> 'start_min', '')::int,
    nullif(payload ->> 'end_min', '')::int,
    nullif(payload ->> 'site', ''),
    payload ->> 'reason',
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

create or replace function public.get_admin_schedule()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meses jsonb;
  v_cambios jsonb;
  v_acks jsonb;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

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
            'displayNameSource', p.display_name_source,
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
      'conflictKey', o.conflict_key,
      'createdAt', to_char(o.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )), '[]'::jsonb)
    into v_cambios
    from public.day_overrides o
    join public.people p on p.id = o.person_id
    left join public.people sp on sp.id = o.support_person_id
    where o.revoked_at is null;

  select coalesce(jsonb_agg(jsonb_build_object(
      'conflictKey', a.conflict_key,
      'note', a.note
    )), '[]'::jsonb)
    into v_acks
    from public.conflict_acks a
    where a.revoked_at is null;

  return jsonb_build_object('months', v_meses, 'overrides', v_cambios, 'acks', v_acks);
end;
$$;

revoke all on function public.get_admin_schedule() from public, anon, authenticated;
grant execute on function public.get_admin_schedule() to authenticated;

create function public.ack_conflict(p_key text, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'CLAVE_VACIA' using errcode = 'P0001';
  end if;

  update public.conflict_acks
    set revoked_at = now()
    where conflict_key = p_key and revoked_at is null;

  insert into public.conflict_acks (conflict_key, note, created_by)
  values (p_key, nullif(trim(p_note), ''), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.ack_conflict(text, text) from public, anon, authenticated;
grant execute on function public.ack_conflict(text, text) to authenticated;

create function public.revoke_conflict_ack(p_key text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;

  update public.conflict_acks
    set revoked_at = now()
    where conflict_key = p_key and revoked_at is null;
end;
$$;

revoke all on function public.revoke_conflict_ack(text) from public, anon, authenticated;
grant execute on function public.revoke_conflict_ack(text) to authenticated;

create function public.set_person_display_name(p_key text, p_name text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'NOMBRE_VACIO' using errcode = 'P0001';
  end if;

  update public.people
    set display_name = trim(p_name), display_name_source = 'manual'
    where key = p_key;
  if not found then
    raise exception 'PERSONA_DESCONOCIDA' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.set_person_display_name(text, text) from public, anon, authenticated;
grant execute on function public.set_person_display_name(text, text) to authenticated;
