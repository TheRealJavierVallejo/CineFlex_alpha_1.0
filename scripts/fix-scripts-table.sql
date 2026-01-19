
-- 🛠️ CINEFLEX: FIX SCRIPTS TABLE user_id CONSTRAINT
-- Run this in the Supabase SQL Editor

-- OPTION 1 (Recommended): Drop the user_id column from scripts
-- Scripts don't need their own user_id because ownership is inherited via project_id → projects.user_id
ALTER TABLE public.scripts DROP COLUMN IF EXISTS user_id;

-- OPTION 2 (Alternative): If you want to keep user_id but allow nulls
-- ALTER TABLE public.scripts ALTER COLUMN user_id DROP NOT NULL;

-- Also ensure the unique constraint exists for upsert to work
ALTER TABLE public.scripts
DROP CONSTRAINT IF EXISTS scripts_project_id_unique;

ALTER TABLE public.scripts
ADD CONSTRAINT scripts_project_id_unique UNIQUE (project_id);

-- Verify the scripts table structure
-- SELECT column_name, is_nullable, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'scripts';
