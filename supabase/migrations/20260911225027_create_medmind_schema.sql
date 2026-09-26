/*
# MEDMIND — Complete Database Schema

## Overview
Multi-user medical study planner for Algerian 6th-year medical students preparing for Residency exam.
Includes shared master curriculum (modules/lessons) managed by admins, per-student study data isolation,
and an admin dashboard for monitoring all students.

## New Tables

1. **profiles** — Extends auth.users with full_name, role (student/admin), exam date, and 3-Couches time allocation.
2. **modules** — Shared master curriculum modules (Biologique vs Clinique). Admin-created, all students read.
3. **lessons** — Shared master lesson list within modules, with tombable flag and priority. Admin-created, all students read.
4. **internat_schedule** — Per-student hospital rotation schedule (P1–P4 phases with dates and gardes).
5. **daily_logs** — Per-student daily energy level and available study hours.
6. **tasks** — Per-student daily auto-generated study tasks with manual override support.
7. **lesson_progress** — Per-student per-lesson progress tracking with 3-Couches QCM scores.
8. **critical_notes** — Per-student high-yield notes/traps vault with tags.
9. **flashcards** — Per-student active-recall flashcards (Q&A pairs).
10. **resumes** — Per-student per-lesson multi-format study materials (PDF, image, text/markdown).
11. **sujets** — Per-student past residency exam paper logs with year-by-year scores.
12. **calendar_events** — Per-student calendar events (rotations, gardes, revision goals, exams).

## Security
- RLS enabled on ALL tables.
- profiles: owner-scoped (read/update own profile). Admins can read all profiles.
- modules/lessons: admins can CRUD; students can SELECT only.
- All other tables: owner-scoped CRUD (auth.uid() = user_id).
- Owner columns default to auth.uid() so inserts work without passing user_id.
*/

-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  exam_date date,
  couche1_pct int NOT NULL DEFAULT 50 CHECK (couche1_pct >= 0 AND couche1_pct <= 100),
  couche2_pct int NOT NULL DEFAULT 30 CHECK (couche2_pct >= 0 AND couche2_pct <= 100),
  couche3_pct int NOT NULL DEFAULT 20 CHECK (couche3_pct >= 0 AND couche3_pct <= 100),
  onboarding_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- 2. MODULES (shared master curriculum)
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('biologique', 'clinique')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_modules" ON modules;
CREATE POLICY "select_modules" ON modules FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_modules" ON modules;
CREATE POLICY "insert_modules" ON modules FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "update_modules" ON modules;
CREATE POLICY "update_modules" ON modules FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "delete_modules" ON modules;
CREATE POLICY "delete_modules" ON modules FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================================
-- 3. LESSONS (shared master lesson list)
-- ============================================================
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_tombable boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  exam_points text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_lessons" ON lessons;
CREATE POLICY "select_lessons" ON lessons FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_lessons" ON lessons;
CREATE POLICY "insert_lessons" ON lessons FOR INSERT
  TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "update_lessons" ON lessons;
CREATE POLICY "update_lessons" ON lessons FOR UPDATE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

DROP POLICY IF EXISTS "delete_lessons" ON lessons;
CREATE POLICY "delete_lessons" ON lessons FOR DELETE
  TO authenticated USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- ============================================================
-- 4. INTERNAT_SCHEDULE (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS internat_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('P1', 'P2', 'P3', 'P4')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  hospital text,
  has_gardes boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE internat_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_internat" ON internat_schedule;
CREATE POLICY "select_own_internat" ON internat_schedule FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_internat" ON internat_schedule;
CREATE POLICY "insert_own_internat" ON internat_schedule FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_internat" ON internat_schedule;
CREATE POLICY "update_own_internat" ON internat_schedule FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_internat" ON internat_schedule;
CREATE POLICY "delete_own_internat" ON internat_schedule FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 5. DAILY_LOGS (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  energy_level text NOT NULL DEFAULT 'normal' CHECK (energy_level IN ('peak', 'normal', 'fatigued', 'exhausted')),
  available_hours numeric NOT NULL DEFAULT 4 CHECK (available_hours >= 0 AND available_hours <= 24),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_daily_logs" ON daily_logs;
CREATE POLICY "select_own_daily_logs" ON daily_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_daily_logs" ON daily_logs;
CREATE POLICY "insert_own_daily_logs" ON daily_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_daily_logs" ON daily_logs;
CREATE POLICY "update_own_daily_logs" ON daily_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_daily_logs" ON daily_logs;
CREATE POLICY "delete_own_daily_logs" ON daily_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 6. TASKS (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  title text NOT NULL,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  couche int NOT NULL DEFAULT 1 CHECK (couche IN (1, 2, 3)),
  duration_minutes int NOT NULL DEFAULT 60,
  completed boolean NOT NULL DEFAULT false,
  deferred boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tasks" ON tasks;
CREATE POLICY "select_own_tasks" ON tasks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tasks" ON tasks;
CREATE POLICY "insert_own_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tasks" ON tasks;
CREATE POLICY "update_own_tasks" ON tasks FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tasks" ON tasks;
CREATE POLICY "delete_own_tasks" ON tasks FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 7. LESSON_PROGRESS (per student per lesson)
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  couche1_qcm text,
  couche2_qcm text,
  couche3_qcm text,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON lesson_progress;
CREATE POLICY "select_own_progress" ON lesson_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_progress" ON lesson_progress;
CREATE POLICY "insert_own_progress" ON lesson_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON lesson_progress;
CREATE POLICY "update_own_progress" ON lesson_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_progress" ON lesson_progress;
CREATE POLICY "delete_own_progress" ON lesson_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 8. CRITICAL_NOTES (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS critical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  content text NOT NULL,
  tag text NOT NULL DEFAULT 'piege' CHECK (tag IN ('piege', 'tombable', 'definition', 'autre')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE critical_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON critical_notes;
CREATE POLICY "select_own_notes" ON critical_notes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notes" ON critical_notes;
CREATE POLICY "insert_own_notes" ON critical_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notes" ON critical_notes;
CREATE POLICY "update_own_notes" ON critical_notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notes" ON critical_notes;
CREATE POLICY "delete_own_notes" ON critical_notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 9. FLASHCARDS (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_flashcards" ON flashcards;
CREATE POLICY "select_own_flashcards" ON flashcards FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_flashcards" ON flashcards;
CREATE POLICY "insert_own_flashcards" ON flashcards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_flashcards" ON flashcards;
CREATE POLICY "update_own_flashcards" ON flashcards FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_flashcards" ON flashcards;
CREATE POLICY "delete_own_flashcards" ON flashcards FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 10. RESUMES (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL,
  format text NOT NULL DEFAULT 'text' CHECK (format IN ('pdf', 'image', 'text')),
  content text,
  file_url text,
  title text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_resumes" ON resumes;
CREATE POLICY "select_own_resumes" ON resumes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_resumes" ON resumes;
CREATE POLICY "insert_own_resumes" ON resumes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_resumes" ON resumes;
CREATE POLICY "update_own_resumes" ON resumes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_resumes" ON resumes;
CREATE POLICY "delete_own_resumes" ON resumes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 11. SUJETS (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS sujets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  subject_name text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  max_score numeric NOT NULL DEFAULT 20,
  weak_areas text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sujets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sujets" ON sujets;
CREATE POLICY "select_own_sujets" ON sujets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sujets" ON sujets;
CREATE POLICY "insert_own_sujets" ON sujets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sujets" ON sujets;
CREATE POLICY "update_own_sujets" ON sujets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sujets" ON sujets;
CREATE POLICY "delete_own_sujets" ON sujets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 12. CALENDAR_EVENTS (per student)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  type text NOT NULL DEFAULT 'revision' CHECK (type IN ('rotation', 'garde', 'revision', 'exam')),
  title text NOT NULL,
  module_id uuid REFERENCES modules(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_calendar" ON calendar_events;
CREATE POLICY "select_own_calendar" ON calendar_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_calendar" ON calendar_events;
CREATE POLICY "insert_own_calendar" ON calendar_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_calendar" ON calendar_events;
CREATE POLICY "update_own_calendar" ON calendar_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_calendar" ON calendar_events;
CREATE POLICY "delete_own_calendar" ON calendar_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_critical_notes_user ON critical_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_sujets_user ON sujets(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_internat_schedule_user ON internat_schedule(user_id);
