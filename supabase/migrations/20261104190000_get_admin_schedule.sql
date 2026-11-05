-- get_admin_schedule: lectura interna para jefatura del horario completo
-- (todos los meses activos y los cambios vigentes), sin pasar por
-- share_links. Solo is_admin() puede llamarla. Fase 4 (horario completo).
-- Documentado en docs/features/horario.md. ADR-0003 (nunca toca
-- schedule_entries).
--
-- Mismo patron que get_shared_view para construir months/overrides,
-- incluido el filtro por fecha dentro del mes de cada version (no solo por
-- import_id): un import puede cubrir mas de un mes calendario, y filtrar
-- solo por import_id duplicaria el import completo en cada mes que
-- comparte (ver la migracion de get_shared_view, 20261104180132).
--
-- Como deshacerla:
--   drop function if exists public.get_admin_schedule();

create function public.get_admin_schedule()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_meses jsonb;
  v_cambios jsonb;
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

  -- Igual que get_shared_view: nunca created_by ni revoked_by (plan §5.6).
  -- El registro de cambios (Fase 5) muestra «Jefatura · cuándo», no quién.
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

  return jsonb_build_object('months', v_meses, 'overrides', v_cambios);
end;
$$;

revoke all on function public.get_admin_schedule() from public;
grant execute on function public.get_admin_schedule() to authenticated;
