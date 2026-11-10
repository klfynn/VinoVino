-- Eigene Weine im Weinkeller (Teil A2, Migration 1 von 2)
--
-- 1. Legt die Tabelle public.custom_wines an: von Hand angelegte Weine, die nur dem jeweiligen
--    Nutzer gehören. Jeder sieht und ändert nur seine eigenen Weine. Die Tabelle wines bleibt
--    der Marktplatz der Händler und bekommt keine Zeilen für eigene Weine.
-- 2. Erweitert public.tasting_notes: Eine Verkostung gehört entweder zu einem Marktplatzwein
--    (wine_id) oder zu einem eigenen Wein (custom_wine_id), nie zu beiden.
--
-- Die Datei darf mehrfach ausgeführt werden (create … if not exists, drop policy if exists,
-- Änderungen an tasting_notes nur, wenn sie noch fehlen). Bestehende Verkostungen bleiben gültig,
-- weil sie ein wine_id haben. Die Spalten von wines, purchased_wines und reviews werden nicht verändert.

-- ── Tabelle custom_wines ─────────────────────────────────────────────────────

create table if not exists public.custom_wines (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name            text not null,
  weingut         text,
  -- Werte wie in wines.weinart (Rotwein, Weißwein, Rosé, Schaumwein, Dessert- und Likörwein).
  -- Bewusst ohne festen Werte-Check, damit neue Weinarten keine Migration brauchen.
  weinart         text,
  -- Text wie in wines, auch „NV“ (ohne Jahrgang) möglich
  jahrgang        text,
  -- Land
  herkunft        text,
  region          text,
  rebsorte        text,
  -- Kaufpreis pro Flasche, optional
  preis           numeric,
  flaschengroesse text,
  -- Flaschen im Keller
  quantity        integer not null default 1,
  -- optionaler Bodentyp (ID aus content/tasting/terroir.json, Abschnitt boeden)
  boden           text,
  -- manual = von Hand angelegt; scan ist für später vorgesehen
  source          text not null default 'manual',
  -- Sterne (Gesamtnote)
  rating          smallint,
  -- freie Notiz zum Wein
  notiz           text,
  -- für Fotos eigener Weine vorgesehen, noch ungenutzt
  bild_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint custom_wines_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint custom_wines_weingut_check check (weingut is null or char_length(weingut) <= 120),
  constraint custom_wines_weinart_check check (weinart is null or char_length(weinart) <= 60),
  constraint custom_wines_jahrgang_check check (jahrgang is null or char_length(jahrgang) <= 20),
  constraint custom_wines_herkunft_check check (herkunft is null or char_length(herkunft) <= 120),
  constraint custom_wines_region_check check (region is null or char_length(region) <= 120),
  constraint custom_wines_rebsorte_check check (rebsorte is null or char_length(rebsorte) <= 120),
  constraint custom_wines_preis_check check (preis is null or preis >= 0),
  constraint custom_wines_flaschengroesse_check check (flaschengroesse is null or char_length(flaschengroesse) <= 20),
  constraint custom_wines_quantity_check check (quantity >= 0),
  constraint custom_wines_boden_check check (boden is null or char_length(boden) <= 60),
  constraint custom_wines_source_check check (source in ('manual', 'scan')),
  constraint custom_wines_rating_check check (rating is null or rating between 1 and 5),
  constraint custom_wines_notiz_check check (notiz is null or char_length(notiz) <= 1000),
  constraint custom_wines_bild_url_check check (bild_url is null or char_length(bild_url) <= 2000)
);

comment on table public.custom_wines is
  'Eigene, von Hand angelegte Weine im Weinkeller. Gehören nur dem jeweiligen Nutzer. Marktplatzweine stehen in wines.';

create index if not exists custom_wines_user_created_idx
  on public.custom_wines (user_id, created_at desc);

-- ── updated_at bei jedem Update setzen ──────────────────────────────────────

create or replace function public.custom_wines_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists custom_wines_set_updated_at on public.custom_wines;
create trigger custom_wines_set_updated_at
  before update on public.custom_wines
  for each row execute function public.custom_wines_set_updated_at();

-- ── Row Level Security für custom_wines ─────────────────────────────────────

alter table public.custom_wines enable row level security;

drop policy if exists "custom_wines_select_own" on public.custom_wines;
create policy "custom_wines_select_own" on public.custom_wines
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "custom_wines_insert_own" on public.custom_wines;
create policy "custom_wines_insert_own" on public.custom_wines
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "custom_wines_update_own" on public.custom_wines;
create policy "custom_wines_update_own" on public.custom_wines
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "custom_wines_delete_own" on public.custom_wines;
create policy "custom_wines_delete_own" on public.custom_wines
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ── Rechte für custom_wines ─────────────────────────────────────────────────
-- Supabase vergibt in public standardmäßig Rechte an anon und authenticated.
-- Deshalb zuerst alles entziehen und dann nur das Nötige erlauben. anon bekommt nichts.

revoke all on table public.custom_wines from anon;
revoke all on table public.custom_wines from authenticated;
grant select, insert, update, delete on table public.custom_wines to authenticated;
grant all on table public.custom_wines to service_role;

revoke all on function public.custom_wines_set_updated_at() from public, anon, authenticated;

-- ── tasting_notes: Verkostung eines Marktplatzweins ODER eines eigenen Weins ─

-- wine_id darf jetzt leer sein (dann ist custom_wine_id gesetzt).
alter table public.tasting_notes alter column wine_id drop not null;

-- Neue Spalte; wird ein eigener Wein gelöscht, verschwinden seine Verkostungen mit.
alter table public.tasting_notes
  add column if not exists custom_wine_id uuid references public.custom_wines(id) on delete cascade;

-- Genau eine der beiden Spalten muss gesetzt sein.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'tasting_notes_wine_ref_check'
      and conrelid = 'public.tasting_notes'::regclass
  ) then
    alter table public.tasting_notes
      add constraint tasting_notes_wine_ref_check
      check (num_nonnulls(wine_id, custom_wine_id) = 1);
  end if;
end;
$$;

create index if not exists tasting_notes_user_custom_wine_tasted_idx
  on public.tasting_notes (user_id, custom_wine_id, tasted_at desc)
  where custom_wine_id is not null;

-- Für das Löschen eigener Weine (on delete cascade)
create index if not exists tasting_notes_custom_wine_idx
  on public.tasting_notes (custom_wine_id)
  where custom_wine_id is not null;

-- Insert- und Update-Policy ersetzen: Bei gesetztem custom_wine_id muss der eigene Wein dem
-- Nutzer gehören. So kann niemand Verkostungen an fremde eigene Weine hängen.
drop policy if exists "tasting_notes_insert_own" on public.tasting_notes;
create policy "tasting_notes_insert_own" on public.tasting_notes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      custom_wine_id is null
      or exists (
        select 1 from public.custom_wines c
        where c.id = custom_wine_id
          and c.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "tasting_notes_update_own" on public.tasting_notes;
create policy "tasting_notes_update_own" on public.tasting_notes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      custom_wine_id is null
      or exists (
        select 1 from public.custom_wines c
        where c.id = custom_wine_id
          and c.user_id = (select auth.uid())
      )
    )
  );

-- ── Prüfabfrage ──────────────────────────────────────────────────────────────
-- Nach dem Ausführen in einem neuen SQL-Editor-Tab einfügen und auf Run klicken.
-- Erwartet wird genau eine Zeile:
--   tabelle_vorhanden = true, rls_an = true, anzahl_policies = 4,
--   policies = custom_wines_delete_own, custom_wines_insert_own, custom_wines_select_own, custom_wines_update_own,
--   rechte_authenticated = DELETE, INSERT, SELECT, UPDATE, rechte_anon = (leer),
--   spalte_custom_wine_id = true, wine_id_darf_leer_sein = true, check_genau_ein_wein = true
--
-- select
--   exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'custom_wines') as tabelle_vorhanden,
--   (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'custom_wines') as rls_an,
--   (select count(*) from pg_policies where schemaname = 'public' and tablename = 'custom_wines') as anzahl_policies,
--   (select string_agg(policyname, ', ' order by policyname) from pg_policies
--      where schemaname = 'public' and tablename = 'custom_wines') as policies,
--   (select string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'custom_wines' and grantee = 'authenticated') as rechte_authenticated,
--   coalesce((select string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
--      where table_schema = 'public' and table_name = 'custom_wines' and grantee = 'anon'), '(leer)') as rechte_anon,
--   exists (select 1 from information_schema.columns where table_schema = 'public'
--      and table_name = 'tasting_notes' and column_name = 'custom_wine_id') as spalte_custom_wine_id,
--   (select is_nullable = 'YES' from information_schema.columns where table_schema = 'public'
--      and table_name = 'tasting_notes' and column_name = 'wine_id') as wine_id_darf_leer_sein,
--   exists (select 1 from pg_constraint where conname = 'tasting_notes_wine_ref_check') as check_genau_ein_wein;
