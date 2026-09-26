/*
# Bypass Auth — Switch to Single-Tenant Mode

## Overview
Removes the authentication requirement so the app opens directly into the dashboard.
All tables now allow anon+authenticated access (single-tenant pattern).
A fixed default profile is inserted so every page has a user_id to work with.

## Changes
1. Drop FK constraint on profiles.id (no longer requires auth.users)
2. Change DEFAULT auth.uid() to a fixed UUID on all user_id columns
3. Replace ALL RLS policies with anon+authenticated CRUD (single-tenant)
4. Insert a default profile row with onboarding_complete=true

## Security
- RLS still enabled on all tables
- Policies allow anon+authenticated full CRUD (intentionally public for no-auth app)
- This is the standard single-tenant pattern per bolt-database guidelines
*/

-- ============================================================
-- 1. Drop FK constraint on profiles.id
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ============================================================
-- 2. Change user_id defaults from auth.uid() to fixed UUID
-- ============================================================
ALTER TABLE internat_schedule ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE daily_logs ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE tasks ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE lesson_progress ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE critical_notes ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE flashcards ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE resumes ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE sujets ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE calendar_events ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000001';

-- Also drop FK constraints on user_id columns that reference auth.users
ALTER TABLE internat_schedule DROP CONSTRAINT IF EXISTS internat_schedule_user_id_fkey;
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_user_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_user_id_fkey;
ALTER TABLE critical_notes DROP CONSTRAINT IF EXISTS critical_notes_user_id_fkey;
ALTER TABLE flashcards DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;
ALTER TABLE resumes DROP CONSTRAINT IF EXISTS resumes_user_id_fkey;
ALTER TABLE sujets DROP CONSTRAINT IF EXISTS sujets_user_id_fkey;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_id_fkey;

-- ============================================================
-- 3. Replace ALL RLS policies with anon+authenticated CRUD
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- modules
DROP POLICY IF EXISTS "select_modules" ON modules;
DROP POLICY IF EXISTS "insert_modules" ON modules;
DROP POLICY IF EXISTS "update_modules" ON modules;
DROP POLICY IF EXISTS "delete_modules" ON modules;
CREATE POLICY "anon_select_modules" ON modules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_modules" ON modules FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_modules" ON modules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_modules" ON modules FOR DELETE TO anon, authenticated USING (true);

-- lessons
DROP POLICY IF EXISTS "select_lessons" ON lessons;
DROP POLICY IF EXISTS "insert_lessons" ON lessons;
DROP POLICY IF EXISTS "update_lessons" ON lessons;
DROP POLICY IF EXISTS "delete_lessons" ON lessons;
CREATE POLICY "anon_select_lessons" ON lessons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_lessons" ON lessons FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_lessons" ON lessons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_lessons" ON lessons FOR DELETE TO anon, authenticated USING (true);

-- internat_schedule
DROP POLICY IF EXISTS "select_own_internat" ON internat_schedule;
DROP POLICY IF EXISTS "insert_own_internat" ON internat_schedule;
DROP POLICY IF EXISTS "update_own_internat" ON internat_schedule;
DROP POLICY IF EXISTS "delete_own_internat" ON internat_schedule;
CREATE POLICY "anon_select_internat" ON internat_schedule FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_internat" ON internat_schedule FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_internat" ON internat_schedule FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_internat" ON internat_schedule FOR DELETE TO anon, authenticated USING (true);

-- daily_logs
DROP POLICY IF EXISTS "select_own_daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "insert_own_daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "update_own_daily_logs" ON daily_logs;
DROP POLICY IF EXISTS "delete_own_daily_logs" ON daily_logs;
CREATE POLICY "anon_select_daily_logs" ON daily_logs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_daily_logs" ON daily_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_daily_logs" ON daily_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_daily_logs" ON daily_logs FOR DELETE TO anon, authenticated USING (true);

-- tasks
DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE TO anon, authenticated USING (true);

-- lesson_progress
DROP POLICY IF EXISTS "select_own_progress" ON lesson_progress;
DROP POLICY IF EXISTS "insert_own_progress" ON lesson_progress;
DROP POLICY IF EXISTS "update_own_progress" ON lesson_progress;
DROP POLICY IF EXISTS "delete_own_progress" ON lesson_progress;
CREATE POLICY "anon_select_progress" ON lesson_progress FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_progress" ON lesson_progress FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_progress" ON lesson_progress FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_progress" ON lesson_progress FOR DELETE TO anon, authenticated USING (true);

-- critical_notes
DROP POLICY IF EXISTS "select_own_notes" ON critical_notes;
DROP POLICY IF EXISTS "insert_own_notes" ON critical_notes;
DROP POLICY IF EXISTS "update_own_notes" ON critical_notes;
DROP POLICY IF EXISTS "delete_own_notes" ON critical_notes;
CREATE POLICY "anon_select_notes" ON critical_notes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_notes" ON critical_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_notes" ON critical_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_notes" ON critical_notes FOR DELETE TO anon, authenticated USING (true);

-- flashcards
DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;
CREATE POLICY "anon_select_flashcards" ON flashcards FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_flashcards" ON flashcards FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_flashcards" ON flashcards FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_flashcards" ON flashcards FOR DELETE TO anon, authenticated USING (true);

-- resumes
DROP POLICY IF EXISTS "select_own_resumes" ON resumes;
DROP POLICY IF EXISTS "insert_own_resumes" ON resumes;
DROP POLICY IF EXISTS "update_own_resumes" ON resumes;
DROP POLICY IF EXISTS "delete_own_resumes" ON resumes;
CREATE POLICY "anon_select_resumes" ON resumes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_resumes" ON resumes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_resumes" ON resumes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_resumes" ON resumes FOR DELETE TO anon, authenticated USING (true);

-- sujets
DROP POLICY IF EXISTS "select_own_sujets" ON sujets;
DROP POLICY IF EXISTS "insert_own_sujets" ON sujets;
DROP POLICY IF EXISTS "update_own_sujets" ON sujets;
DROP POLICY IF EXISTS "delete_own_sujets" ON sujets;
CREATE POLICY "anon_select_sujets" ON sujets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_sujets" ON sujets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_sujets" ON sujets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_sujets" ON sujets FOR DELETE TO anon, authenticated USING (true);

-- calendar_events
DROP POLICY IF EXISTS "select_own_calendar" ON calendar_events;
DROP POLICY IF EXISTS "insert_own_calendar" ON calendar_events;
DROP POLICY IF EXISTS "update_own_calendar" ON calendar_events;
DROP POLICY IF EXISTS "delete_own_calendar" ON calendar_events;
CREATE POLICY "anon_select_calendar" ON calendar_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_calendar" ON calendar_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_calendar" ON calendar_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_calendar" ON calendar_events FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- 4. Insert default profile
-- ============================================================
INSERT INTO profiles (id, full_name, email, role, onboarding_complete)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dr. Test Student', 'student@medmind.dz', 'admin', true)
ON CONFLICT (id) DO NOTHING;
