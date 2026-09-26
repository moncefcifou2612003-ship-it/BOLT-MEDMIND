import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { Profile, Lesson } from '@/lib/types';
import {
  Crown, Users, Search, Trash2,
} from 'lucide-react';

export function AdminDashboardPage() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Profile[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [studentStats, setStudentStats] = useState<Record<string, { tasks: number; completed: number; progress: number }>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setStudents(data as Profile[]);
  }, []);

  const fetchLessons = useCallback(async () => {
    const { data } = await supabase.from('lessons').select('*');
    if (data) setLessons(data as Lesson[]);
  }, []);

  const fetchStudentStats = useCallback(async () => {
    const stats: Record<string, { tasks: number; completed: number; progress: number }> = {};
    for (const student of students) {
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', student.id);
      const { count: completedCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', student.id)
        .eq('completed', true);
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('progress_pct')
        .eq('user_id', student.id);
      const avgProgress = progress && progress.length > 0
        ? progress.reduce((sum, p) => sum + p.progress_pct, 0) / progress.length
        : 0;
      stats[student.id] = { tasks: taskCount || 0, completed: completedCount || 0, progress: avgProgress };
    }
    setStudentStats(stats);
  }, [students]);

  useEffect(() => {
    Promise.all([fetchStudents(), fetchLessons()]).finally(() => setLoading(false));
  }, [fetchStudents, fetchLessons]);

  useEffect(() => {
    if (students.length > 0) fetchStudentStats();
  }, [students, fetchStudentStats]);

  // ميزة حذف البروفايل / الطالب
  const deleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le profil de ${studentName} ?`)) return;

    const { error } = await supabase.from('profiles').delete().eq('id', studentId);
    
    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast('Profil supprimé avec succès', 'success');
    await fetchStudents();
  };

  const filteredStudents = students.filter((s) =>
    (s.full_name && s.full_name.toLowerCase().includes(search.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Crown className="w-8 h-8 text-lavender-500 animate-pulse-soft" /></div>;
  }

  const totalStudents = students.filter((s) => s.role === 'student').length;

  return (
    <div className="space-y-6">
      {/* Student monitoring with badge counter */}
      <div className="clay-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slateindigo-700 dark:text-slateindigo-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-lavender-600" /> Student Profiles
            </h3>
            <span className="bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {totalStudents}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slateindigo-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="clay-input pl-10 w-64"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-slateindigo-400 text-center py-4">No students found.</p>
          ) : (
            filteredStudents.map((student) => {
              const stats = studentStats[student.id];
              return (
                <div key={student.id} className="clay-card-sm p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-600 flex items-center justify-center text-white font-bold shrink-0">
                    {student.full_name ? student.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slateindigo-800 dark:text-slateindigo-50 truncate">{student.full_name || 'Utilisateur'}</p>
                      {student.role === 'admin' && (
                        <span className="pill-badge bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300">
                          <Crown className="w-3 h-3" /> Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slateindigo-400 truncate">{student.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-slateindigo-700 dark:text-slateindigo-100">{stats?.tasks ?? 0}</p>
                      <p className="text-xs text-slateindigo-400">Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-mint-500">{stats?.completed ?? 0}</p>
                      <p className="text-xs text-slateindigo-400">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lavender-600">{Math.round(stats?.progress ?? 0)}%</p>
                      <p className="text-xs text-slateindigo-400">Progress</p>
                    </div>
                  </div>

                  {/* زر حذف البروفايل */}
                  <button
                    onClick={() => deleteStudent(student.id, student.full_name || student.email)}
                    className="p-2 rounded-xl text-coral-500 hover:bg-coral-500/10 transition-colors shrink-0"
                    title="Supprimer le profil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}