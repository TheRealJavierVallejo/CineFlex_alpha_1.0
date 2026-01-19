
-- 🛠️ CINEFLEX: ADD MISSING UNIQUE CONSTRAINT
-- Run this in the Supabase SQL Editor to fix the ON CONFLICT error.

-- Add unique constraint on project_id for scripts table
-- This allows upsert with onConflict='project_id' to work.

ALTER TABLE public.scripts
ADD CONSTRAINT scripts_project_id_unique UNIQUE (project_id);

-- Optional: Verify the constraint was created
-- SELECT conname FROM pg_constraint WHERE conrelid = 'public.scripts'::regclass;
