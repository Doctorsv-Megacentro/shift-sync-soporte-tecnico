-- save_day_override / revoke_day_override: crear y deshacer un cambio de
-- jefatura sobre un día (plan §7.5, Fase 5). `day_overrides` nunca toca
-- `schedule_entries` (ADR-0003); un solo cambio vigente por persona y día
-- (índice único ya existe desde la migración inicial), así que guardar uno
-- nuevo revoca el anterior en la misma transacción. Documentado en
-- docs/features/horario.md.
--
-- Cómo deshacerla:
--   drop function if exists public.save_day_override(jsonb);
--   drop function if exists public.revoke_day_override(text, date);

create function public.save_day_override(payload jsonb)
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

  -- Solo un cambio vigente por persona y día: revocar el anterior antes de
  -- insertar el nuevo, para no chocar con day_overrides_vigente_idx.
  update public.day_overrides
    set revoked_at = now(), revoked_by = auth.uid()
    where person_id = v_person_id and date = v_date and revoked_at is null;

  insert into public.day_overrides (
    person_id, date, kind, start_min, end_min, site, reason, note, support_person_id, created_by
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
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.save_day_override(jsonb) from public, anon, authenticated;
grant execute on function public.save_day_override(jsonb) to authenticated;

-- «Volver a lo de la hoja» y «Deshacer» del registro de cambios: la misma
-- operación, revocar el cambio vigente de esa persona y fecha.
create function public.revoke_day_override(p_person_key text, p_date date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;

  update public.day_overrides o
    set revoked_at = now(), revoked_by = auth.uid()
    from public.people p
    where o.person_id = p.id
      and p.key = p_person_key
      and o.date = p_date
      and o.revoked_at is null;
end;
$$;

revoke all on function public.revoke_day_override(text, date) from public, anon, authenticated;
grant execute on function public.revoke_day_override(text, date) to authenticated;
