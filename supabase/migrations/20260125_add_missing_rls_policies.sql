-- ============================================================
-- 🔒 COMPLETE RLS POLICIES FOR ALL TABLES
-- Generated: 2026-01-25
-- 
-- This migration secures 8 tables that were previously unprotected.
-- DO NOT run on production without testing on staging first.
-- ============================================================

-- ============================================================
-- PART 1: SCRIPTS TABLE
-- ============================================================
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- Drop any existing permissive policies
DROP POLICY IF EXISTS "Enable all access for authenticated users scripts" ON scripts;

CREATE POLICY "Users can view own scripts"
  ON scripts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scripts"
  ON scripts FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scripts"
  ON scripts FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scripts"
  ON scripts FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 2: SCENES TABLE
-- ============================================================
-- Note: scenes already has RLS enabled, just ensure all 4 policies exist

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view own scenes" ON scenes;
DROP POLICY IF EXISTS "Users can insert own scenes" ON scenes;
DROP POLICY IF EXISTS "Users can update own scenes" ON scenes;
DROP POLICY IF EXISTS "Users can delete own scenes" ON scenes;

-- Recreate with correct pattern
CREATE POLICY "Users can view own scenes"
  ON scenes FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scenes"
  ON scenes FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scenes"
  ON scenes FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scenes"
  ON scenes FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 3: SHOTS TABLE
-- ============================================================
-- Note: shots already has RLS enabled, ensure all policies

DROP POLICY IF EXISTS "Users can view own shots" ON shots;
DROP POLICY IF EXISTS "Users can insert own shots" ON shots;
DROP POLICY IF EXISTS "Users can update own shots" ON shots;
DROP POLICY IF EXISTS "Users can delete own shots" ON shots;

CREATE POLICY "Users can view own shots"
  ON shots FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own shots"
  ON shots FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own shots"
  ON shots FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own shots"
  ON shots FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 4: CHARACTERS TABLE
-- ============================================================
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own characters"
  ON characters FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own characters"
  ON characters FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own characters"
  ON characters FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own characters"
  ON characters FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 5: OUTFITS TABLE
-- ============================================================
ALTER TABLE outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own outfits"
  ON outfits FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own outfits"
  ON outfits FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own outfits"
  ON outfits FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own outfits"
  ON outfits FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 6: LOCATIONS TABLE
-- ============================================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own locations"
  ON locations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own locations"
  ON locations FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own locations"
  ON locations FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own locations"
  ON locations FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );


-- ============================================================
-- PART 7: IMAGE_LIBRARY TABLE (IF IT EXISTS)
-- ============================================================
-- Conditional enable - if table doesn't exist, this will be skipped
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'image_library') THEN
        ALTER TABLE image_library ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own images"
          ON image_library FOR SELECT
          USING (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can insert own images"
          ON image_library FOR INSERT
          WITH CHECK (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can update own images"
          ON image_library FOR UPDATE
          USING (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can delete own images"
          ON image_library FOR DELETE
          USING (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );
    END IF;
END $$;


-- ============================================================
-- PART 8: STORY_NOTES TABLE (IF IT EXISTS)
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'story_notes') THEN
        ALTER TABLE story_notes ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view own story notes"
          ON story_notes FOR SELECT
          USING (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can insert own story notes"
          ON story_notes FOR INSERT
          WITH CHECK (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can update own story notes"
          ON story_notes FOR UPDATE
          USING (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );

        CREATE POLICY "Users can delete own story notes"
          ON story_notes FOR DELETE
          USING (
            project_id IN (
              SELECT id FROM projects WHERE user_id = auth.uid()
            )
          );
    END IF;
END $$;


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying migration to confirm it worked
-- ============================================================

-- Check which tables have RLS enabled (should be all 9)
/*
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'scripts', 'scenes', 'shots', 'characters', 'outfits', 'locations', 'image_library', 'story_notes')
ORDER BY tablename;
*/

-- Check all policies (should see 4 per table = SELECT, INSERT, UPDATE, DELETE)
/*
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
*/


-- ============================================================
-- EMERGENCY ROLLBACK
-- Copy to new SQL file and run to undo this migration
-- ============================================================
/*
-- Disable RLS on all tables
ALTER TABLE scripts DISABLE ROW LEVEL SECURITY;
ALTER TABLE scenes DISABLE ROW LEVEL SECURITY;
ALTER TABLE shots DISABLE ROW LEVEL SECURITY;
ALTER TABLE characters DISABLE ROW LEVEL SECURITY;
ALTER TABLE outfits DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
-- Only if these exist:
-- ALTER TABLE image_library DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE story_notes DISABLE ROW LEVEL SECURITY;

-- Drop all policies created by this migration
DROP POLICY IF EXISTS "Users can view own scripts" ON scripts;
DROP POLICY IF EXISTS "Users can insert own scripts" ON scripts;
DROP POLICY IF EXISTS "Users can update own scripts" ON scripts;
DROP POLICY IF EXISTS "Users can delete own scripts" ON scripts;

DROP POLICY IF EXISTS "Users can view own scenes" ON scenes;
DROP POLICY IF EXISTS "Users can insert own scenes" ON scenes;
DROP POLICY IF EXISTS "Users can update own scenes" ON scenes;
DROP POLICY IF EXISTS "Users can delete own scenes" ON scenes;

DROP POLICY IF EXISTS "Users can view own shots" ON shots;
DROP POLICY IF EXISTS "Users can insert own shots" ON shots;
DROP POLICY IF EXISTS "Users can update own shots" ON shots;
DROP POLICY IF EXISTS "Users can delete own shots" ON shots;

DROP POLICY IF EXISTS "Users can view own characters" ON characters;
DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
DROP POLICY IF EXISTS "Users can update own characters" ON characters;
DROP POLICY IF EXISTS "Users can delete own characters" ON characters;

DROP POLICY IF EXISTS "Users can view own outfits" ON outfits;
DROP POLICY IF EXISTS "Users can insert own outfits" ON outfits;
DROP POLICY IF EXISTS "Users can update own outfits" ON outfits;
DROP POLICY IF EXISTS "Users can delete own outfits" ON outfits;

DROP POLICY IF EXISTS "Users can view own locations" ON locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON locations;
DROP POLICY IF EXISTS "Users can update own locations" ON locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON locations;

DROP POLICY IF EXISTS "Users can view own images" ON image_library;
DROP POLICY IF EXISTS "Users can insert own images" ON image_library;
DROP POLICY IF EXISTS "Users can update own images" ON image_library;
DROP POLICY IF EXISTS "Users can delete own images" ON image_library;

DROP POLICY IF EXISTS "Users can view own story notes" ON story_notes;
DROP POLICY IF EXISTS "Users can insert own story notes" ON story_notes;
DROP POLICY IF EXISTS "Users can update own story notes" ON story_notes;
DROP POLICY IF EXISTS "Users can delete own story notes" ON story_notes;
*/
