export type UserRole = 'student' | 'admin';

export type EnergyLevel = 'peak' | 'normal' | 'fatigued' | 'exhausted';

export type ModuleCategory = 'biologique' | 'clinique';

export type LessonPriority = 'high' | 'normal' | 'low';

export type NoteTag = 'piege' | 'tombable' | 'definition' | 'autre';

export type ResumeFormat = 'pdf' | 'image' | 'text';

export type CalendarEventType = 'rotation' | 'garde' | 'revision' | 'exam';

export type InternatPhase = 'P1' | 'P2' | 'P3' | 'P4';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  exam_date: string | null;
  couche1_pct: number;
  couche2_pct: number;
  couche3_pct: number;
  onboarding_complete: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  name: string;
  category: ModuleCategory;
  created_by: string | null;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  is_tombable: boolean;
  priority: LessonPriority;
  exam_points: string | null;
  created_at: string;
}

export interface InternatScheduleEntry {
  id: string;
  user_id: string;
  phase: InternatPhase;
  start_date: string;
  end_date: string;
  hospital: string | null;
  has_gardes: boolean;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  energy_level: EnergyLevel;
  available_hours: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  date: string;
  title: string;
  lesson_id: string | null;
  couche: number;
  duration_minutes: number;
  completed: boolean;
  deferred: boolean;
  sort_order: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  progress_pct: number;
  couche1_qcm: string | null;
  couche2_qcm: string | null;
  couche3_qcm: string | null;
  completed: boolean;
  updated_at: string;
}

export interface CriticalNote {
  id: string;
  user_id: string;
  lesson_id: string | null;
  module_id: string | null;
  content: string;
  tag: NoteTag;
  created_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  lesson_id: string | null;
  module_id: string | null;
  question: string;
  answer: string;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  lesson_id: string | null;
  format: ResumeFormat;
  content: string | null;
  file_url: string | null;
  title: string | null;
  created_at: string;
}

export interface Sujet {
  id: string;
  user_id: string;
  year: number;
  subject_name: string;
  score: number;
  max_score: number;
  weak_areas: string | null;
  notes: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  date: string;
  type: CalendarEventType;
  title: string;
  module_id: string | null;
  created_at: string;
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
  lesson_count?: number;
}

export interface LessonWithProgress extends Lesson {
  module_name?: string;
  module_category?: ModuleCategory;
  progress?: LessonProgress | null;
}
