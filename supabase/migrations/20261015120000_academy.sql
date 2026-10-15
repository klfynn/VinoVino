-- Fortschritt pro Lektion
create table if not exists public.academy_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  best_score int not null default 0,
  attempts int not null default 1,
  unique (user_id, lesson_id)
);

alter table public.academy_progress enable row level security;

create policy "academy_progress_select_own" on public.academy_progress
  for select to authenticated using (user_id = auth.uid());
create policy "academy_progress_insert_own" on public.academy_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy "academy_progress_update_own" on public.academy_progress
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.academy_progress to authenticated;

-- Streak
create table if not exists public.academy_streak (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  freeze_available boolean not null default false,
  freeze_last_granted_week text
);

alter table public.academy_streak enable row level security;

create policy "academy_streak_select_own" on public.academy_streak
  for select to authenticated using (user_id = auth.uid());

-- Schreiben nur über die Funktion unten
grant select on public.academy_streak to authenticated;

-- Streak-Logik serverseitig (Zeitzone Europe/Berlin)
create or replace function public.academy_touch()
returns public.academy_streak
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  today date := (now() at time zone 'Europe/Berlin')::date;
  wk text := to_char(now() at time zone 'Europe/Berlin', 'IYYY-"W"IW');
  s public.academy_streak;
  gap int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.academy_streak (user_id) values (uid)
  on conflict (user_id) do nothing;

  select * into s from public.academy_streak where user_id = uid for update;

  -- Streak fortschreiben (Freeze zählt nur, wenn genau ein Tag fehlt)
  if s.last_active_date is null then
    s.current_streak := 1;
  elsif s.last_active_date = today then
    null; -- heute schon gezählt
  else
    gap := today - s.last_active_date;
    if gap = 1 then
      s.current_streak := s.current_streak + 1;
    elsif gap = 2 and s.freeze_available then
      s.current_streak := s.current_streak + 1;
      s.freeze_available := false;
    else
      s.current_streak := 1;
    end if;
  end if;

  -- Wöchentlicher Freeze: höchstens 1 gleichzeitig, einmal pro Kalenderwoche
  if s.freeze_last_granted_week is distinct from wk then
    s.freeze_available := true;
    s.freeze_last_granted_week := wk;
  end if;

  s.last_active_date := today;
  s.longest_streak := greatest(s.longest_streak, s.current_streak);

  update public.academy_streak
     set current_streak = s.current_streak,
         longest_streak = s.longest_streak,
         last_active_date = s.last_active_date,
         freeze_available = s.freeze_available,
         freeze_last_granted_week = s.freeze_last_granted_week
   where user_id = uid;

  return s;
end;
$$;

revoke all on function public.academy_touch() from public;
grant execute on function public.academy_touch() to authenticated;
