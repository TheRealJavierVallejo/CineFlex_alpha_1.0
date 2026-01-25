-- ============================================================
-- 🎬 COMPLETE CINEFLEX DATABASE SCHEMA
-- Version: 1.0 (Alpha)
-- Generated: 2026-01-19
-- 
-- This file consolidates all table definitions, RLS policies,
-- triggers, and storage configurations for the CineFlex app.
-- Run in Supabase SQL Editor in order from top to bottom.
-- ============================================================


-- ============================================================
-- SECTION 1: PROFILES TABLE (User Settings & API Keys)
-- ============================================================

-- Create a table for public profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  last_synced TIMESTAMP WITH TIME ZONE,
  claude_api_key TEXT,
  gemini_api_key TEXT,
  claude_api_key_updated_at TIMESTAMP WITH TIME ZONE,
  gemini_api_key_updated_at TIMESTAMP WITH TIME ZONE
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- SECTION 2: PROJECTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  title_page JSONB DEFAULT NULL,
  
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Permissive policies for Alpha testing (allows all authenticated users)
CREATE POLICY "Enable all access for authenticated users"
ON public.projects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also allow Anon access for reading (optional, good for debugging)
CREATE POLICY "Enable read access for anon"
ON public.projects
FOR SELECT
TO anon
USING (true);


-- ============================================================
-- SECTION 3: SCRIPTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  content JSONB DEFAULT '[]'::jsonb,
  last_saved TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  CONSTRAINT scripts_project_id_unique UNIQUE (project_id)
);

-- Note: user_id column was removed from scripts table.
-- Script ownership is inherited via project_id → projects.user_id

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

-- Permissive policies for Alpha testing
CREATE POLICY "Enable all access for authenticated users scripts"
ON public.scripts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- SECTION 4: SCENES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  sequence INT NOT NULL,
  heading TEXT NOT NULL,
  action_notes TEXT,
  script_elements JSONB DEFAULT '[]'::jsonb,
  location_id UUID
);

ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scenes" ON public.scenes 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.scenes.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own scenes" ON public.scenes 
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.scenes.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update own scenes" ON public.scenes 
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.scenes.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own scenes" ON public.scenes 
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.scenes.project_id AND user_id = auth.uid()
  ));


-- ============================================================
-- SECTION 5: SHOTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  shot_type TEXT,
  description TEXT,
  dialogue TEXT,
  camera_movement TEXT,
  -- Store AI generation data and complex fields in JSONB
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shots" ON public.shots 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.shots.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own shots" ON public.shots 
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.shots.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update own shots" ON public.shots 
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.shots.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own shots" ON public.shots 
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = public.shots.project_id AND user_id = auth.uid()
  ));


-- ============================================================
-- SECTION 6: ASSET TABLES (Characters, Outfits, Locations)
-- ============================================================

-- Characters
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  reference_photos JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Outfits
CREATE TABLE IF NOT EXISTS public.outfits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reference_photos JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reference_photos JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 7: REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for scenes and shots
ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shots;


-- ============================================================
-- SECTION 8: STORAGE BUCKETS & POLICIES
-- ============================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Images are publicly accessible" ON storage.objects 
  FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Users can upload images" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'images' AND auth.uid() = owner);

CREATE POLICY "Users can update own images" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'images' AND auth.uid() = owner);

CREATE POLICY "Users can delete own images" ON storage.objects 
  FOR DELETE USING (bucket_id = 'images' AND auth.uid() = owner);


-- ============================================================
-- END OF SCHEMA
-- ============================================================
