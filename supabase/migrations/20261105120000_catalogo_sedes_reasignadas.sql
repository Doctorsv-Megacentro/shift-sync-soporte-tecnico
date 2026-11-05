-- El catálogo de departamentos reasigna a Megacentro y Phoenix Tower varios
-- departamentos que estaban "Sin sede" o en "Activo Fijo" (petición de jefatura).
-- "Activo Fijo" deja de ser una sede: ningún departamento la usa ya.
-- Ver src/domain/config.ts y docs/datos/catalogo-departamentos.md.

alter table public.day_overrides
  drop constraint day_overrides_sede_valida,
  add constraint day_overrides_sede_valida check (
    site is null or site in (
      'Megacentro',
      'Tuscania',
      'Phoenix Tower',
      'Atento',
      'Santa Ana',
      'San Miguel'
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
        'San Miguel'
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

-- Cómo deshacerla:
--   1. Restaurar save_day_override desde 20261105015523_compartir_completo.sql.
--   2. alter table public.day_overrides
--        drop constraint day_overrides_sede_valida,
--        add constraint day_overrides_sede_valida check (
--          site is null or site in (
--            'Megacentro', 'Tuscania', 'Phoenix Tower', 'Atento',
--            'Santa Ana', 'San Miguel', 'Activo Fijo'
--          )
--        );
