-- Private Notiz für Marktplatzweine im Weinkeller (Teil A2b)
--
-- Hintergrund: In Teil A2 wurde die Notiz zu einem Marktplatzwein in reviews.review_text
-- gespeichert. Für reviews gibt es aber eine Policy, nach der alle alle Bewertungen sehen.
-- Weinkeller-Notizen sind privat. Deshalb bekommt purchased_wines eine eigene Spalte notiz.
-- Die Sterne bleiben in reviews.rating. reviews.review_text schreibt die App nicht mehr; die
-- Spalte bleibt für eine spätere, bewusst öffentliche Shop-Bewertung reserviert.
--
-- Was diese Datei tut (additiv, mehrfach ausführbar):
-- 1. Ergänzt die Spalte purchased_wines.notiz (text, darf leer sein).
-- 2. Legt einen Check-Constraint an: höchstens 1000 Zeichen (nur, falls er noch nicht existiert).
-- Bestehende Spalten, Daten, Policies und Rechte werden nicht verändert.
--
-- Zugriff: Die Policies purchased_wines_select_own, _insert_own, _update_own und _delete_own aus
-- 20261111100100_cellar_access.sql erlauben jedem Nutzer nur seine eigenen Zeilen
-- (auth.uid() = user_id). Sie gelten für die ganze Zeile und damit auch für die neue Spalte.
-- Neue Policies sind deshalb nicht nötig.

-- ── Voraussetzung prüfen ─────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.purchased_wines') is null then
    raise exception 'Tabelle public.purchased_wines fehlt. Migration abgebrochen, nichts wurde geändert.';
  end if;
end;
$$;

-- ── Spalte ───────────────────────────────────────────────────────────────────

alter table public.purchased_wines add column if not exists notiz text;

comment on column public.purchased_wines.notiz is
  'Private Weinkeller-Notiz des Nutzers zu diesem Marktplatzwein (max. 1000 Zeichen). Nur für den Nutzer selbst sichtbar.';

-- ── Check-Constraint ─────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'purchased_wines_notiz_laenge'
      and conrelid = 'public.purchased_wines'::regclass
  ) then
    alter table public.purchased_wines
      add constraint purchased_wines_notiz_laenge check (notiz is null or char_length(notiz) <= 1000);
  end if;
end;
$$;

-- ── Prüfabfrage ──────────────────────────────────────────────────────────────
-- Nach dem Ausführen in einem neuen SQL-Editor-Tab einfügen und auf Run klicken.
-- Erwartet wird genau eine Zeile: spalte = notiz, typ = text, constraint_da = true,
-- update_policy_da = true.
--
-- select
--   c.column_name as spalte,
--   c.data_type as typ,
--   exists (select 1 from pg_constraint k
--           where k.conname = 'purchased_wines_notiz_laenge'
--             and k.conrelid = 'public.purchased_wines'::regclass) as constraint_da,
--   exists (select 1 from pg_policies p
--           where p.schemaname = 'public' and p.tablename = 'purchased_wines'
--             and p.policyname = 'purchased_wines_update_own') as update_policy_da
-- from information_schema.columns c
-- where c.table_schema = 'public' and c.table_name = 'purchased_wines' and c.column_name = 'notiz';
