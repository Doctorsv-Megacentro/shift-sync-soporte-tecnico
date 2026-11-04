-- Esquema inicial: tablas, RLS y las funciones RPC de la Fase 2.
-- Documentado en docs/arquitectura/modelo-de-datos.md (diagrama ER) y
-- docs/arquitectura/seguridad.md. Decisiones: ADR-0003, ADR-0006, ADR-0010.
--
-- Cómo deshacerla (runbook docs/operacion/migraciones.md):
--   drop function if exists public.get_shared_view(text);
--   drop function if exists public.activate_import(uuid, date);
--   drop function if exists public.publish_import(jsonb);
--   drop function if exists public.is_admin();
--   drop table if exists public.share_links;
--   drop table if exists public.conflict_acks;
--   drop table if exists public.day_overrides;
--   drop table if exists public.schedule_entries;
--   drop table if exists public.people;
--   drop table if exists public.month_versions;
--   drop table if exists public.imports;
--   drop table if exists public.admins;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Quién tiene acceso de jefatura. Se carga por SQL siguiendo el runbook de
-- variables-entorno.md; los correos NUNCA van en una migración ni en el repo.
create table public.admins (
  email text primary key,
  name text,
  created_at timestamptz not null default now()
);

-- Una fila por publicación de Fuente de datos. content_hash evita publicar
-- el mismo archivo dos veces (ADR-0010).
create table public.imports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('excel', 'sheet')),
  source_label text not null,
  sheet_gid text,
  months date[] not null check (array_length(months, 1) > 0),
  content_hash text not null,
  summary jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  imported_by uuid not null references auth.users (id),
  imported_at timestamptz not null default now()
);

create index imports_content_hash_idx on public.imports (content_hash);

-- La versión activa de cada mes. Volver atrás es apuntar a un import_id
-- anterior (ADR-0010); panel, horario y enlaces leen siempre de aquí.
create table public.month_versions (
  month date primary key,
  import_id uuid not null references public.imports (id),
  activated_by uuid not null references auth.users (id),
  activated_at timestamptz not null default now()
);

-- Identidad estable de una persona entre meses y cambios de jefatura.
-- display_name_source='manual' se respeta en importaciones siguientes.
create table public.people (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  last_raw_name text not null,
  display_name text not null,
  display_name_source text not null default 'auto' check (display_name_source in ('auto', 'manual')),
  joined_on date,
  first_seen_import uuid not null references public.imports (id),
  last_seen_import uuid not null references public.imports (id)
);

-- El horario tal como venía en la hoja. raw se conserva porque el parser es
-- la única fuente de verdad (ADR-0004); kind/start_min/end_min son lo ya
-- interpretado (mismo contrato que ShiftValue en src/domain/types.ts).
create table public.schedule_entries (
  import_id uuid not null references public.imports (id),
  person_id uuid not null references public.people (id),
  date date not null,
  department text not null,
  raw text not null,
  kind text not null check (kind in ('work', 'off', 'vacation', 'unknown')),
  start_min integer,
  end_min integer,
  primary key (import_id, person_id, date)
);

create index schedule_entries_person_date_idx on public.schedule_entries (person_id, date);
create index schedule_entries_date_idx on public.schedule_entries (date);

-- Los cambios de jefatura: la capa que se aplica sobre la hoja (ADR-0003).
-- La hoja nunca se modifica. Deshacer = revoked_at; editar = revocar el
-- vigente e insertar uno nuevo, así el historial queda completo.
create table public.day_overrides (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id),
  date date not null,
  kind text not null check (kind in ('work', 'off', 'vacation')),
  start_min integer,
  end_min integer,
  site text,
  reason text not null,
  note text,
  support_person_id uuid references public.people (id),
  conflict_key text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id)
);

-- Un solo cambio vigente por persona y día.
create unique index day_overrides_vigente_idx
  on public.day_overrides (person_id, date)
  where revoked_at is null;

create index day_overrides_conflict_key_idx on public.day_overrides (conflict_key) where revoked_at is null;

-- «Aceptar como está»: lo único que se guarda de un conflicto (ADR-0007).
-- Los conflictos en sí son funciones puras y no se persisten.
create table public.conflict_acks (
  id uuid primary key default gen_random_uuid(),
  conflict_key text not null,
  note text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index conflict_acks_key_idx on public.conflict_acks (conflict_key) where revoked_at is null;

-- Enlaces de solo lectura. scope + params definen qué devuelve
-- get_shared_view (Fase 3 en adelante); slug es aleatorio largo (plan §7.6).
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  scope text not null check (scope in ('operacion', 'semana', 'dia', 'persona', 'cambio')),
  params jsonb not null default '{}'::jsonb,
  title text,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_opened_at timestamptz
);

-- ¿El correo de la sesión está en la lista de jefatura? Se define antes que
-- las políticas RLS porque las usa directamente.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.admins
    where email = (auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: activado en todas las tablas. anon no tiene política de lectura en
-- ninguna (docs/arquitectura/seguridad.md). Jefatura entra por is_admin().
-- ---------------------------------------------------------------------------

alter table public.admins enable row level security;
alter table public.imports enable row level security;
alter table public.month_versions enable row level security;
alter table public.people enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.day_overrides enable row level security;
alter table public.conflict_acks enable row level security;
alter table public.share_links enable row level security;

create policy admins_solo_admin on public.admins
  for select to authenticated using (public.is_admin());

create policy imports_solo_admin on public.imports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy month_versions_solo_admin on public.month_versions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy people_solo_admin on public.people
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy schedule_entries_solo_admin on public.schedule_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy day_overrides_solo_admin on public.day_overrides
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy conflict_acks_solo_admin on public.conflict_acks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy share_links_solo_admin on public.share_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ninguna tabla tiene política para el rol `anon`: sin una política que lo
-- permita, RLS deniega por defecto. La única vía pública es get_shared_view.

-- ---------------------------------------------------------------------------
-- RPC
--
-- Todas security definer con search_path fijo, para que no se puedan
-- secuestrar con un esquema puesto por delante en el search_path de quien
-- llama (docs/arquitectura/seguridad.md).
-- ---------------------------------------------------------------------------

-- Publica una versión nueva. Payload (ver src/data/imports.ts para el
-- armado exacto):
--
-- {
--   "source": "excel" | "sheet",
--   "source_label": text,
--   "sheet_gid": text | null,
--   "content_hash": text,
--   "summary": jsonb,
--   "warnings": jsonb,
--   "months": [
--     {
--       "month": "2026-11-01",
--       "people": [
--         { "key": text, "raw_name": text, "display_name": text, "joined_on": date | null }
--       ],
--       "entries": [
--         { "person_key": text, "date": date, "department": text, "raw": text,
--           "kind": "work"|"off"|"vacation"|"unknown", "start_min": int | null, "end_min": int | null }
--       ]
--     }
--   ]
-- }
create function public.publish_import(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_import_id uuid;
  v_months date[];
  v_content_hash text;
  v_existing_id uuid;
  v_month jsonb;
  v_month_date date;
  v_person jsonb;
  v_person_id uuid;
  v_entry jsonb;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;

  v_content_hash := payload ->> 'content_hash';
  -- array_agg de cero filas da NULL, no un array vacío: coalesce evita que
  -- un payload sin meses rompa con un error de NOT NULL distinto al que
  -- describe el problema real (la restricción months_no_vacio de la tabla).
  select coalesce(array_agg((m ->> 'month')::date), array[]::date[])
    into v_months
    from jsonb_array_elements(payload -> 'months') as m;

  -- Si el mismo contenido ya es la versión activa de todos estos meses, no
  -- se publica de nuevo (ADR-0010). Es la comprobación de servidor; el
  -- cliente ya evita llegar hasta aquí en el caso normal.
  select i.id into v_existing_id
    from public.imports i
    where i.content_hash = v_content_hash
      and i.months = v_months
      and (
        select bool_and(mv.import_id = i.id)
        from public.month_versions mv
        where mv.month = any (v_months)
      )
    limit 1;

  if v_existing_id is not null then
    raise exception 'SIN_CAMBIOS' using errcode = 'P0001';
  end if;

  insert into public.imports (source, source_label, sheet_gid, months, content_hash, summary, warnings, imported_by)
  values (
    payload ->> 'source',
    payload ->> 'source_label',
    payload ->> 'sheet_gid',
    v_months,
    v_content_hash,
    coalesce(payload -> 'summary', '{}'::jsonb),
    coalesce(payload -> 'warnings', '[]'::jsonb),
    auth.uid()
  )
  returning id into v_import_id;

  for v_month in select * from jsonb_array_elements(payload -> 'months')
  loop
    v_month_date := (v_month ->> 'month')::date;

    -- Upsert de personas por clave estable. display_name solo se
    -- actualiza si la corrección no es manual (ADR no numerado, plan §5.5.6).
    for v_person in select * from jsonb_array_elements(v_month -> 'people')
    loop
      insert into public.people (key, last_raw_name, display_name, joined_on, first_seen_import, last_seen_import)
      values (
        v_person ->> 'key',
        v_person ->> 'raw_name',
        v_person ->> 'display_name',
        nullif(v_person ->> 'joined_on', '')::date,
        v_import_id,
        v_import_id
      )
      on conflict (key) do update set
        last_raw_name = excluded.last_raw_name,
        display_name = case
          when public.people.display_name_source = 'manual' then public.people.display_name
          else excluded.display_name
        end,
        joined_on = coalesce(public.people.joined_on, excluded.joined_on),
        last_seen_import = v_import_id
      returning id into v_person_id;
    end loop;

    -- Las entradas del día referencian a la persona por su clave, resuelta
    -- contra la tabla people que ya tiene el upsert de arriba aplicado.
    insert into public.schedule_entries (import_id, person_id, date, department, raw, kind, start_min, end_min)
    select
      v_import_id,
      p.id,
      (e ->> 'date')::date,
      e ->> 'department',
      e ->> 'raw',
      e ->> 'kind',
      nullif(e ->> 'start_min', '')::integer,
      nullif(e ->> 'end_min', '')::integer
    from jsonb_array_elements(v_month -> 'entries') as e
    join public.people p on p.key = e ->> 'person_key';

    insert into public.month_versions (month, import_id, activated_by)
    values (v_month_date, v_import_id, auth.uid())
    on conflict (month) do update set
      import_id = excluded.import_id,
      activated_by = excluded.activated_by,
      activated_at = now();
  end loop;

  return v_import_id;
end;
$$;

revoke all on function public.publish_import(jsonb) from public, anon, authenticated;
grant execute on function public.publish_import(jsonb) to authenticated;

-- Vuelve a una versión anterior: el mes pasa a apuntar a ese import_id.
create function public.activate_import(p_import_id uuid, p_month date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUERIDO' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.imports where id = p_import_id and p_month = any (months)
  ) then
    raise exception 'IMPORT_NO_CUBRE_EL_MES' using errcode = 'P0001';
  end if;

  update public.month_versions
  set import_id = p_import_id, activated_by = auth.uid(), activated_at = now()
  where month = p_month;
end;
$$;

revoke all on function public.activate_import(uuid, date) from public, anon, authenticated;
grant execute on function public.activate_import(uuid, date) to authenticated;
