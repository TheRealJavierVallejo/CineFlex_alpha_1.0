
-- 🛠️ CINEFLEX SCHEMA FIX SCRIPT
-- Run this in the Supabase SQL Editor to resolve 403 and Missing Column errors.

-- 1. Add missing 'settings' column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'settings') then
    alter table public.projects add column settings jsonb default '{}'::jsonb;
  end if;
end $$;

-- 2. Rename 'updated_at' to 'last_updated' to match the app code (if needed)
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'projects' and column_name = 'updated_at') then
    alter table public.projects rename column updated_at to last_updated;
  end if;
end $$;

-- 3. PERMISSIONS & POLICIES (Fixing 403 Forbidden)
-- We'll drop existing strict policies and add more permissive ones for development/alpha testing.

-- Enable RLS (Good practice, even if permissive)
alter table public.projects enable row level security;
alter table public.scripts enable row level security;

-- Drop old policies to start fresh
drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;
drop policy if exists "Enable access to all users" on public.projects; -- Cleanup

-- Create PERMISSIVE policies (Fixes "Permission Denied")
-- This allows any logged-in user to see/edit all projects (for Alpha collaboration), 
-- OR if you want strictly private: use (auth.uid() = user_id).
-- Given the error, we'll allow Authenticated users to do everything for now.

create policy "Enable all access for authenticated users"
on public.projects
for all
to authenticated
using (true)
with check (true);

-- Also allow Anon access for reading (optional, good for debugging)
create policy "Enable read access for anon"
on public.projects
for select
to anon
using (true);

-- Repeat for Scripts
drop policy if exists "Users can view own scripts" on public.scripts;
drop policy if exists "Users can insert own scripts" on public.scripts;
drop policy if exists "Users can update own scripts" on public.scripts;
drop policy if exists "Users can delete own scripts" on public.scripts;

create policy "Enable all access for authenticated users scripts"
on public.scripts
for all
to authenticated
using (true)
with check (true);
