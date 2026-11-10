-- Verkostungsbogen für „Mein Weinkeller“ (Teil A: Fundament)
--
-- Legt die Tabelle public.tasting_notes an. Eine Zeile ist eine Verkostung eines Weins
-- durch einen Nutzer. Mehrere Verkostungen je Wein sind ausdrücklich erlaubt.
-- Sterne und freier Bewertungstext bleiben unverändert in public.reviews.
--
-- Die Datei darf mehrfach ausgeführt werden (create … if not exists, drop … if exists).
-- Bestehende Tabellen (wines, purchased_wines, reviews) werden nicht verändert.

-- ── Tabelle ──────────────────────────────────────────────────────────────────

create table if not exists public.tasting_notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  wine_id           uuid not null references public.wines(id) on delete cascade,
  -- Weinkeller-Eintrag, aus dem verkostet wurde. Der Fremdschlüssel wird weiter unten
  -- angelegt, sobald sicher ist, dass purchased_wines.id den Typ uuid hat.
  purchased_wine_id uuid,
  tasted_at         timestamptz not null default now(),
  level             text not null,
  -- Schwerpunkt (zum Beispiel sehen, riechen, schmecken, terroir); wird in Teil C genutzt
  focus             text,
  -- Akademie-Lektion, aus der die Verkostung gestartet wurde (zum Beispiel l03); Teil C
  lesson_id         text,
  -- Blindverkostung; Teil D
  blind             boolean not null default false,
  -- Version des Aufbaus von data
  schema_version    integer not null default 1,
  -- Der eigentliche Bogen (siehe lib/tasting/types.ts)
  data              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint tasting_notes_level_check
    check (level in ('einfach', 'erweitert', 'profi')),
  constraint tasting_notes_data_check
    check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 20000)
);

comment on table public.tasting_notes is
  'Verkostungsbögen je Nutzer und Wein. Mehrere Verkostungen je Wein erlaubt. Sterne bleiben in reviews.';

-- ── Fremdschlüssel auf purchased_wines (nur wenn der Typ passt) ─────────────
-- purchased_wines liegt nicht im Repository; deshalb wird der Typ der Spalte id geprüft.
-- Passt er nicht, bleibt die Spalte ohne Verknüpfung und es erscheint ein Hinweis.

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'tasting_notes_purchased_wine_id_fkey'
      and conrelid = 'public.tasting_notes'::regclass
  ) then
    return;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'purchased_wines'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    alter table public.tasting_notes
      add constraint tasting_notes_purchased_wine_id_fkey
      foreign key (purchased_wine_id) references public.purchased_wines(id) on delete set null;
  else
    raise warning 'tasting_notes: purchased_wines.id fehlt oder ist nicht vom Typ uuid. purchased_wine_id bleibt ohne Fremdschlüssel.';
  end if;
end;
$$;

-- ── Indizes ──────────────────────────────────────────────────────────────────

create index if not exists tasting_notes_user_wine_tasted_idx
  on public.tasting_notes (user_id, wine_id, tasted_at desc);

create index if not exists tasting_notes_user_tasted_idx
  on public.tasting_notes (user_id, tasted_at desc);

-- Für das Löschen von Weinen bzw. Weinkeller-Einträgen (on delete cascade / set null)
create index if not exists tasting_notes_wine_idx
  on public.tasting_notes (wine_id);

create index if not exists tasting_notes_purchased_wine_idx
  on public.tasting_notes (purchased_wine_id)
  where purchased_wine_id is not null;

-- ── updated_at bei jedem Update setzen ──────────────────────────────────────

create or replace function public.tasting_notes_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists tasting_notes_set_updated_at on public.tasting_notes;
create trigger tasting_notes_set_updated_at
  before update on public.tasting_notes
  for each row execute function public.tasting_notes_set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.tasting_notes enable row level security;

drop policy if exists "tasting_notes_select_own" on public.tasting_notes;
create policy "tasting_notes_select_own" on public.tasting_notes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "tasting_notes_insert_own" on public.tasting_notes;
create policy "tasting_notes_insert_own" on public.tasting_notes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasting_notes_update_own" on public.tasting_notes;
create policy "tasting_notes_update_own" on public.tasting_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasting_notes_delete_own" on public.tasting_notes;
create policy "tasting_notes_delete_own" on public.tasting_notes
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── Rechte ───────────────────────────────────────────────────────────────────
-- Supabase vergibt in public standardmäßig Rechte an anon und authenticated.
-- Deshalb zuerst alles entziehen und dann nur das Nötige erlauben.

revoke all on table public.tasting_notes from anon;
revoke all on table public.tasting_notes from authenticated;
grant select, insert, update, delete on table public.tasting_notes to authenticated;
grant all on table public.tasting_notes to service_role;

-- Die Trigger-Funktion wird nur vom Trigger aufgerufen, nicht direkt über die API.
revoke all on function public.tasting_notes_set_updated_at() from public, anon, authenticated;

-- ── Prüfabfrage ──────────────────────────────────────────────────────────────
-- Nach dem Ausführen in einem neuen SQL-Editor-Tab einfügen und auf Run klicken.
-- Erwartet wird genau eine Zeile:
--   tabelle_vorhanden = true, rls_an = true, anzahl_policies = 4,
--   policies = tasting_notes_delete_own, tasting_notes_insert_own, tasting_notes_select_own, tasting_notes_update_own,
--   rechte_authenticated = DELETE, INSERT, SELECT, UPDATE, rechte_anon = (leer),
--   fk_weinkeller = true (false nur, wenn purchased_wines.id kein uuid ist)
--
-- select
--   exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'tasting_notes') as tabelle_vorhanden,
--   (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'tasting_notes') as rls_an,
--   (select count(*) from pg_policies where schemaname = 'public' and tablename = 'tasting_notes') as anzahl_policies,
--   (select string_agg(policyname, ', ' order by policyname) from pg_policies
--      where schemaname = 'public' and tablename = 'tasting_notes') as policies,
--   (select string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'tasting_notes' and grantee = 'authenticated') as rechte_authenticated,
--   coalesce((select string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'tasting_notes' and grantee = 'anon'), '(leer)') as rechte_anon,
--   exists (select 1 from pg_constraint where conname = 'tasting_notes_purchased_wine_id_fkey') as fk_weinkeller;
