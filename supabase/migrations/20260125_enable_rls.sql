-- ============================================================
-- 🔒 SUPABASE ROW LEVEL SECURITY (RLS) MIGRATION
-- Generated: 2026-01-25
--
-- CAUTION: Apply this to a staging project first!
-- Use "supabase db dump --data-only" to backup before running.
-- ============================================================

-- 1. Enable RLS on the main projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 2. CREATE POLICIES
-- These policies restrict access so users can only access rows 
-- where their auth.uid() matches the row's user_id.

-- Allow users to view their own projects
CREATE POLICY "Users view own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own projects
CREATE POLICY "Users update own projects"
ON projects FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to insert their own projects
CREATE POLICY "Users insert own projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own projects
CREATE POLICY "Users delete own projects"
ON projects FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================
-- EMERGENCY ROLLBACK
-- Run the lines below to disable RLS if something breaks.
-- ============================================================
/*
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own projects" ON projects;
DROP POLICY IF EXISTS "Users update own projects" ON projects;
DROP POLICY IF EXISTS "Users insert own projects" ON projects;
DROP POLICY IF EXISTS "Users delete own projects" ON projects;
*/
