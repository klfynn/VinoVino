-- Zugriff der App auf Weinkeller und Bewertungen (Teil A2, Migration 2 von 2)
--
-- WICHTIG: Erst ausführen, nachdem die Diagnoseabfrage aus dem PR ausgeführt und ihr Ergebnis
-- bestätigt wurde. Die Tabellen purchased_wines und reviews liegen nicht im Repository; ihr
-- aktueller Stand (RLS, Policies, Rechte) ist deshalb unbekannt.
--
-- Was diese Datei tut (additiv, mehrfach ausführbar):
-- 1. Schaltet Row Level Security für purchased_wines und reviews ein (falls noch nicht an).
-- 2. Legt eigene Policies mit eindeutigen Namen an, jeweils „nur eigene Zeilen“
--    (auth.uid() = user_id): purchased_wines_select_own, _insert_own, _update_own, _delete_own
--    und dasselbe für reviews. Entfernt werden vorher nur genau diese eigenen Namen.
-- 3. Vergibt select, insert, update, delete an authenticated. anon bekommt nichts dazu.
--
-- Zusätzliche Policies, die schon existieren (zum Beispiel für das Händlerportal oder für
-- öffentlich sichtbare Bewertungen), bleiben unangetastet. Policies in PostgreSQL addieren sich:
-- Eine Zeile ist sichtbar, wenn irgendeine passende Policy sie erlaubt.
-- Bestehende Rechte (auch die von anon) werden nicht entzogen, Spalten werden nicht verändert.
--
-- Risiko: War RLS bisher aus, sehen alle Zugänge ohne passende Policy ab jetzt keine Zeilen
-- mehr. Das betrifft unter Umständen das Händlerportal (separates Repo vinovino-merchant),
-- falls es diese Tabellen mit dem anon- oder einem Nutzer-Schlüssel liest. Der service_role-
-- Schlüssel ist davon nicht betroffen. Nach dem Ausführen das Händlerportal testen.

-- ── Voraussetzungen prüfen ───────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array['purchased_wines', 'reviews'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'user_id'
    ) then
      raise exception 'Tabelle public.% oder ihre Spalte user_id fehlt. Migration abgebrochen, nichts wurde geändert.', t;
    end if;
  end loop;
end;
$$;

-- ── purchased_wines ──────────────────────────────────────────────────────────

alter table public.purchased_wines enable row level security;

drop policy if exists "purchased_wines_select_own" on public.purchased_wines;
create policy "purchased_wines_select_own" on public.purchased_wines
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "purchased_wines_insert_own" on public.purchased_wines;
create policy "purchased_wines_insert_own" on public.purchased_wines
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "purchased_wines_update_own" on public.purchased_wines;
create policy "purchased_wines_update_own" on public.purchased_wines
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "purchased_wines_delete_own" on public.purchased_wines;
create policy "purchased_wines_delete_own" on public.purchased_wines
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.purchased_wines to authenticated;

-- ── reviews ──────────────────────────────────────────────────────────────────

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.reviews to authenticated;

-- ── Prüfabfrage ──────────────────────────────────────────────────────────────
-- Nach dem Ausführen in einem neuen SQL-Editor-Tab einfügen und auf Run klicken.
-- Erwartet werden zwei Zeilen (purchased_wines, reviews), jeweils:
--   rls_an = true, eigene_policies = 4,
--   rechte_authenticated enthält DELETE, INSERT, SELECT, UPDATE.
-- alle_policies zeigt zusätzlich fremde Policies (zum Beispiel vom Händlerportal), die erhalten bleiben.
--
-- select
--   t.tablename as tabelle,
--   t.rowsecurity as rls_an,
--   (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename
--      and p.policyname in (t.tablename || '_select_own', t.tablename || '_insert_own',
--                           t.tablename || '_update_own', t.tablename || '_delete_own')) as eigene_policies,
--   (select string_agg(p.policyname, ', ' order by p.policyname) from pg_policies p
--      where p.schemaname = 'public' and p.tablename = t.tablename) as alle_policies,
--   (select string_agg(g.privilege_type, ', ' order by g.privilege_type) from information_schema.role_table_grants g
--      where g.table_schema = 'public' and g.table_name = t.tablename and g.grantee = 'authenticated') as rechte_authenticated
-- from pg_tables t
-- where t.schemaname = 'public' and t.tablename in ('purchased_wines', 'reviews')
-- order by t.tablename;
