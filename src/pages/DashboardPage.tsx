import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { 
  Calendar, 
  ChevronRight, 
  Sparkles, 
  Layers,
  CalendarDays,
  SunMedium,
  ChevronDown
} from 'lucide-react';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';

export function DashboardPage() {
  // États de sélection (Couche, Mois, Jour)
  const [selectedCouche, setSelectedCouche] = useState<number>(1);
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<number>(1);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  // État pour afficher/masquer le menu popover des filtres
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Progression globale
  const [globalProgress, setGlobalProgress] = useState<number>(0);

  // Liste des tâches du jour
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // دالة حساب وزن الأهمية تماماً مثل CoursModulesPage
  const getImportanceWeight = (importance: 'important' | 'moyen' | 'moins') => {
    switch (importance) {
      case 'important': return 3;
      case 'moyen': return 2;
      case 'moins': return 1;
      default: return 2;
    }
  };

  // دالة حساب التقدم الإجمالي لجميع الموديولات والدروس
  const calculateGlobalProgress = (mods: any[]) => {
    let totalMaxScoreAll = 0;
    let totalEarnedScoreAll = 0;

    mods.forEach(mod => {
      if (!mod.lessons || mod.lessons.length === 0) return;
      
      mod.lessons.forEach((l: any) => {
        const weight = getImportanceWeight(l.importance);
        const lessonMaxScore = 7 * weight; // 3 couches + 3 qcm + 1 resume = 7
        totalMaxScoreAll += lessonMaxScore;

        let lessonEarned = 0;
        if (l.c1) lessonEarned += weight;
        if (l.c2) lessonEarned += weight;
        if (l.c3) lessonEarned += weight;
        if (l.q1) lessonEarned += weight;
        if (l.q2) lessonEarned += weight;
        if (l.q3) lessonEarned += weight;
        if (l.resume) lessonEarned += weight;

        totalEarnedScoreAll += lessonEarned;
      });
    });

    if (totalMaxScoreAll === 0) return 0;
    return Math.round((totalEarnedScoreAll / totalMaxScoreAll) * 100);
  };

  // جلب البيانات وحساب التقدم الإجمالي للمستخدم الحالي فقط دون مشاركة البيانات القديمة
  const fetchGlobalProgressData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || TEST_USER_ID;

      // جلب موديولات ودروس المستخدم الحالي فقط عبر user_id
      const [{ data: modsData }, { data: lessonsData }] = await Promise.all([
        supabase.from('modules').select('*').eq('user_id', userId),
        supabase.from('lessons').select('*').eq('user_id', userId)
      ]);

      const formattedModules = (modsData || []).map((mod: any) => ({
        id: mod.id,
        importance: mod.importance,
        lessons: (lessonsData || []).filter((l: any) => l.module_id === mod.id)
      }));

      const progress = calculateGlobalProgress(formattedModules);
      setGlobalProgress(progress);
    } catch (err) {
      console.error('Erreur lors du calcul de la progression globale:', err);
    }
  };

  // Fermer le menu popover si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // الاستماع لتحديثات الموديولات والدروس لتحديث الدائرة فوراً
  useEffect(() => {
    fetchGlobalProgressData();

    const handleModulesChanged = (e: any) => {
      if (e.detail) {
        setGlobalProgress(calculateGlobalProgress(e.detail));
      }
    };

    window.addEventListener('medmind_modules_changed', handleModulesChanged);
    return () => {
      window.removeEventListener('medmind_modules_changed', handleModulesChanged);
    };
  }, []);

  // 3. Récupérer les leçons du jour depuis calendar_tasks
  const fetchTasksForDay = useCallback(async () => {
    try {
      setLoading(true);
      setMessage('');

      const { data, error } = await supabase
        .from('calendar_tasks')
        .select('*')
        .eq('couche_id', selectedCouche)
        .eq('sub_period', selectedSubPeriod)
        .eq('day_number', selectedDayNumber);

      if (error) throw error;

      if (data && data.length > 0) {
        setTasks(data);
      } else {
        setTasks([]);
        setMessage(`Aucun cours programmé pour (Couche ${selectedCouche} - Mois ${selectedSubPeriod} - Jour ${selectedDayNumber}).`);
      }
    } catch (err: any) {
      console.error('Erreur:', err.message);
      setMessage('Une erreur est survenue lors de la récupération des données.');
    } finally {
      setLoading(false);
    }
  }, [selectedCouche, selectedSubPeriod, selectedDayNumber]);

  useEffect(() => {
    fetchTasksForDay();
  }, [fetchTasksForDay]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6">
      
      {/* 1. En-tête Unifié avec Tableau de Bord Quotidien et Progression Globale côte à côte */}
      <div className="bg-[#F3F4FD] dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-6">
        
        {/* القسم الأيسر: العنوان والوصف بحجم أصغر */}
        <div className="space-y-1.5 text-left w-full sm:w-auto">
          <span className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
            Préparation Concours Résidanat 🩺
          </span>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white mt-1">
            Tableau de Bord Quotidien 👋
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Suivez votre programme avec précision et consultez vos cours quotidiens.
          </p>
        </div>

        {/* القسم الأيمن: دائرة التقدم الإجمالي بحجم كبير جداً */}
        <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-800/60 px-5 py-3 rounded-2xl border border-indigo-100 dark:border-slate-700/60 shadow-xs shrink-0">
          <div className="flex items-center justify-center">
            <ProgressRing 
              value={globalProgress} 
              label={`${globalProgress}%`} 
              sublabel="" 
              size={95} 
              color="#6C5CE7" 
            />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-slate-800 dark:text-white tracking-wide">
              Progression Globale
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {globalProgress}% complété
            </p>
          </div>
        </div>

      </div>

      {/* 2. Programme du Jour */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-5 relative">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs border border-indigo-50 dark:border-slate-800">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Programme du Jour
              </h3>
            </div>
          </div>

          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 px-3.5 py-2 rounded-xl border border-indigo-100/60 dark:border-slate-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-all shadow-xs cursor-pointer"
            >
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-indigo-500" /> C{selectedCouche}</span>
              <span className="text-indigo-300">/</span>
              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> Mois {selectedSubPeriod}</span>
              <span className="text-indigo-300">/</span>
              <span className="flex items-center gap-1"><SunMedium className="w-3.5 h-3.5 text-indigo-500" /> J{selectedDayNumber}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 rounded-2xl shadow-xl p-4 z-50 space-y-3.5 animate-fadeIn">
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Modifier la sélection
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">Couche :</label>
                  <select
                    value={selectedCouche}
                    onChange={(e) => setSelectedCouche(Number(e.target.value))}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
                  >
                    <option value={1}>1ère Couche</option>
                    <option value={2}>2ème Couche</option>
                    <option value={3}>3ème Couche</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">Mois / Période :</label>
                  <select
                    value={selectedSubPeriod}
                    onChange={(e) => setSelectedSubPeriod(Number(e.target.value))}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-600"
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>Mois {m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 block">Jour :</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={selectedDayNumber}
                    onChange={(e) => setSelectedDayNumber(Math.max(1, Number(e.target.value)))}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white text-center focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Appliquer
                </button>
              </div>
            )}
          </div>
        </div>

        {/* قائمة الدروس */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1 border-t border-slate-100 dark:border-slate-800 pt-4">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Jour {selectedDayNumber} - Mois {selectedSubPeriod} (Couche {selectedCouche})
            </span>
            <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-xl">
              {tasks.length} éléments
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-600" /> Chargement des cours...
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <p className="font-medium">{message || 'Aucun cours trouvé.'}</p>
              <p className="text-[11px] text-slate-400">Assurez-vous d'avoir généré le planning depuis la page Calendrier.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const moduleName = task.module_name || 'Module sans nom';
                const courses = Array.isArray(task.course_titles) ? task.course_titles : [];

                return (
                  <div 
                    key={task.id}
                    className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-xs font-bold shadow-xs">
                          Jour {task.day_number || selectedDayNumber}
                        </span>
                        <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wide">
                          {moduleName}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="text-[11px] font-bold text-slate-400">
                        Leçons programmées :
                      </div>
                      
                      {courses.length > 0 ? (
                        <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500/40">
                          {courses.map((courseTitle: string, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 py-1">
                              <span>{courseTitle}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">Aucun cours détaillé.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}