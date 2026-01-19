
-- Create Projects Table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  settings jsonb default '{}'::jsonb,
  
  constraint projects_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- Create Scripts Table
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  content jsonb default '[]'::jsonb,
  last_saved timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint scripts_project_id_unique unique (project_id)
);

-- Create Assets Tables
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  image_url text,
  reference_photos jsonb default '[]'::jsonb
);

create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  reference_photos jsonb default '[]'::jsonb
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  reference_photos jsonb default '[]'::jsonb
);

-- RLS Policies
alter table public.projects enable row level security;
alter table public.scripts enable row level security;
alter table public.characters enable row level security;
alter table public.outfits enable row level security;
alter table public.locations enable row level security;

-- Projects Policies
create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
create policy "Users can insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

-- Scripts Policies (inherit from project)
create policy "Users can view own scripts" on public.scripts for select using (exists (select 1 from public.projects where id = public.scripts.project_id and user_id = auth.uid()));
create policy "Users can insert own scripts" on public.scripts for insert with check (exists (select 1 from public.projects where id = public.scripts.project_id and user_id = auth.uid()));
create policy "Users can update own scripts" on public.scripts for update using (exists (select 1 from public.projects where id = public.scripts.project_id and user_id = auth.uid()));
create policy "Users can delete own scripts" on public.scripts for delete using (exists (select 1 from public.projects where id = public.scripts.project_id and user_id = auth.uid()));

-- Create Scenes Table
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  sequence int not null,
  heading text not null,
  action_notes text,
  script_elements jsonb default '[]'::jsonb,
  location_id uuid
);

-- Create Shots Table
create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  scene_id uuid references public.scenes(id) on delete cascade,
  sequence int not null,
  shot_type text,
  description text,
  dialogue text,
  camera_movement text,
  -- Store AI generation data and complex fields in JSONB
  metadata jsonb default '{}'::jsonb
);

-- RLS for new tables
alter table public.scenes enable row level security;
alter table public.shots enable row level security;

create policy "Users can view own scenes" on public.scenes for select using (exists (select 1 from public.projects where id = public.scenes.project_id and user_id = auth.uid()));
create policy "Users can insert own scenes" on public.scenes for insert with check (exists (select 1 from public.projects where id = public.scenes.project_id and user_id = auth.uid()));
create policy "Users can update own scenes" on public.scenes for update using (exists (select 1 from public.projects where id = public.scenes.project_id and user_id = auth.uid()));
create policy "Users can delete own scenes" on public.scenes for delete using (exists (select 1 from public.projects where id = public.scenes.project_id and user_id = auth.uid()));

create policy "Users can view own shots" on public.shots for select using (exists (select 1 from public.projects where id = public.shots.project_id and user_id = auth.uid()));
create policy "Users can insert own shots" on public.shots for insert with check (exists (select 1 from public.projects where id = public.shots.project_id and user_id = auth.uid()));
create policy "Users can update own shots" on public.shots for update using (exists (select 1 from public.projects where id = public.shots.project_id and user_id = auth.uid()));
create policy "Users can delete own shots" on public.shots for delete using (exists (select 1 from public.projects where id = public.shots.project_id and user_id = auth.uid()));

-- Enable realtime for scenes and shots
alter publication supabase_realtime add table public.scenes;
alter publication supabase_realtime add table public.shots;

-- Storage Buckets
insert into storage.buckets (id, name, public) values ('images', 'images', true) on conflict (id) do nothing;

create policy "Images are publicly accessible" on storage.objects for select using ( bucket_id = 'images' );
create policy "Users can upload images" on storage.objects for insert with check ( bucket_id = 'images' and auth.uid() = owner );
create policy "Users can update own images" on storage.objects for update using ( bucket_id = 'images' and auth.uid() = owner );
create policy "Users can delete own images" on storage.objects for delete using ( bucket_id = 'images' and auth.uid() = owner );
