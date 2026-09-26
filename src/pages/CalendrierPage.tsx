import { useState, useEffect } from 'react';
import { 
  Calendar,
  Clock,
  Sliders,
  Layers,
  Trash2,
  Plus,
  Check,
  X,
  RotateCw,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LessonItem {
  id: string;
  title: string;
  importance: 'important' | 'moyen' | 'moins';
  difficulty?: 'facile' | 'moyen' | 'difficile';
}

interface ModuleItem {
  id: string;
  name: string;
  category: 'biologique' | 'clinique';
  importance: 'important' | 'moyen' | 'moins';
  difficulty?: 'facile' | 'moyen' | 'difficile';
  lessons: LessonItem[];
}

interface DailyTask {
  id: string;
  dayNumber: number;
  date: string;
  coucheId: number; 
  subPeriod: number; 
  moduleName: string;
  courseTitles: string[];
  estimatedHours: number;
  isGardeDay: boolean;
  isDelayed?: boolean;
  courseStatuses?: Record<string, 'done' | 'delayed' | 'normal'>;
}

export function CalendrierPage() {
  const [currentCouche, setCurrentCouche] = useState<number>(1);
  const [currentSubPeriod, setCurrentSubPeriod] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  const [coucheMaxPeriods, setCoucheMaxPeriods] = useState<Record<number, number>>({ 1: 8, 2: 3, 3: 3 });
  const [dailyHoursAvailable, setDailyHoursAvailable] = useState<number>(5);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  
  const [addingTaskForDay, setAddingTaskForDay] = useState<string | null>(null);
  const [newCourseTitle, setNewCourseTitle] = useState<string>('');

  const [modulesData, setModulesData] = useState<ModuleItem[]>([]);
  const [monthlyPlan, setMonthlyPlan] = useState<DailyTask[]>([]);
  const [coucheSelections, setCoucheSelections] = useState<Record<number, { moduleId: string; selected: boolean; orderIndex: number }[]>>({
    1: [], 2: [], 3: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      let modQuery = supabase.from('modules').select('*');
      let lessQuery = supabase.from('lessons').select('*');
      let tasksQuery = supabase.from('calendar_tasks').select('*');

      if (userId) {
        modQuery = modQuery.eq('user_id', userId);
        lessQuery = lessQuery.eq('user_id', userId);
        tasksQuery = tasksQuery.eq('user_id', userId);
      }

      const [{ data: modsData }, { data: lessonsData }, { data: tasksData }] = await Promise.all([
        modQuery,
        lessQuery,
        tasksQuery
      ]);

      const formattedModules: ModuleItem[] = (modsData || []).map((mod: any) => ({
        id: mod.id,
        name: mod.name,
        category: mod.category,
        importance: mod.importance,
        difficulty: mod.difficulty || undefined,
        lessons: (lessonsData || [])
          .filter((l: any) => l.module_id === mod.id)
          .map((l: any) => ({
            id: l.id,
            title: l.title,
            importance: l.importance,
            difficulty: l.difficulty || undefined
          }))
      }));

      setModulesData(formattedModules);

      const initialSelections: Record<number, { moduleId: string; selected: boolean; orderIndex: number }[]> = { 1: [], 2: [], 3: [] };
      [1, 2, 3].forEach(couche => {
        formattedModules.forEach((mod, idx) => {
          initialSelections[couche].push({ moduleId: mod.id, selected: true, orderIndex: idx + 1 });
        });
      });
      setCoucheSelections(initialSelections);

      if (tasksData) {
        const formattedTasks: DailyTask[] = tasksData.map((t: any) => ({
          id: t.id,
          dayNumber: t.day_number,
          date: t.date,
          coucheId: t.couche_id,
          subPeriod: t.sub_period,
          moduleName: t.module_name,
          courseTitles: typeof t.course_titles === 'string' ? JSON.parse(t.course_titles) : (t.course_titles || []),
          estimatedHours: t.estimated_hours,
          isGardeDay: t.is_garde_day,
          isDelayed: t.is_delayed,
          courseStatuses: t.course_statuses || {}
        }));
        setMonthlyPlan(formattedTasks);
      }

    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleModulesChanged = (e: any) => {
      if (e.detail) {
        setModulesData(e.detail);
      }
    };
    window.addEventListener('medmind_modules_changed', handleModulesChanged);
    return () => {
      window.removeEventListener('medmind_modules_changed', handleModulesChanged);
    };
  }, []);

  const getMaxPeriodsForCouche = (couche: number) => {
    return coucheMaxPeriods[couche] ?? (couche === 1 ? 8 : 3);
  };

  const generateDynamicPlanForCouche = async (couche: number) => {
    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      let deleteQuery = supabase.from('calendar_tasks').delete().eq('couche_id', couche);
      if (userId) {
        deleteQuery = deleteQuery.eq('user_id', userId);
      } else {
        deleteQuery = deleteQuery.is('user_id', null);
      }
      await deleteQuery;

      const selections = coucheSelections[couche] || [];
      const selectedModIds = selections
        .filter(s => s.selected)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const maxPeriods = getMaxPeriodsForCouche(couche);

      if (selectedModIds.length === 0) {
        setMonthlyPlan(prev => prev.filter(p => p.coucheId !== couche));
        setIsGenerating(false);
        setShowSetupModal(false);
        return;
      }

      const orderedModules = selectedModIds
        .map(sel => modulesData.find(m => m.id === sel.moduleId))
        .filter((m): m is ModuleItem => !!m && m.lessons && m.lessons.length > 0);

      if (orderedModules.length === 0) {
        setMonthlyPlan(prev => prev.filter(p => p.coucheId !== couche));
        setIsGenerating(false);
        setShowSetupModal(false);
        return;
      }

      const generatedTasks: DailyTask[] = [];
      const totalDaysAvailable = maxPeriods * 30;
      let globalDayCounter = 1;

      orderedModules.forEach((mod) => {
        const sortedLessons = [...mod.lessons].sort((a, b) => {
          const impWeightA = a.importance === 'important' ? 3 : a.importance === 'moyen' ? 2 : 1;
          const impWeightB = b.importance === 'important' ? 3 : b.importance === 'moyen' ? 2 : 1;
          if (impWeightB !== impWeightA) return impWeightB - impWeightA;

          const diffWeightA = a.difficulty === 'difficile' ? 3 : a.difficulty === 'moyen' ? 2 : 1;
          const diffWeightB = b.difficulty === 'difficile' ? 3 : b.difficulty === 'moyen' ? 2 : 1;
          return diffWeightA - diffWeightB;
        });

        const modDifficultyFactor = mod.difficulty === 'difficile' ? 1 : mod.difficulty === 'moyen' ? 2 : 3;
        const baseLessonsPerDay = Math.max(1, Math.min(3, Math.ceil(dailyHoursAvailable / 2) * modDifficultyFactor));

        let lessonIdx = 0;
        while (lessonIdx < sortedLessons.length) {
          const isGardeDay = globalDayCounter % 6 === 0;
          const effectiveLessonsCount = isGardeDay 
            ? Math.max(1, Math.floor(baseLessonsPerDay * 0.5)) 
            : baseLessonsPerDay;

          const dayLessons = sortedLessons.slice(lessonIdx, lessonIdx + effectiveLessonsCount);
          lessonIdx += dayLessons.length;

          const currentCalculatedPeriod = Math.min(
            maxPeriods,
            Math.max(1, Math.ceil(globalDayCounter / (totalDaysAvailable / maxPeriods)))
          );

          generatedTasks.push({
            id: crypto.randomUUID(),
            dayNumber: globalDayCounter,
            date: `2026-09-${String(Math.min(30, globalDayCounter)).padStart(2, '0')}`,
            coucheId: couche,
            subPeriod: currentCalculatedPeriod,
            moduleName: mod.name,
            courseTitles: dayLessons.map(l => l.title),
            estimatedHours: isGardeDay ? Math.max(2, Math.floor(dailyHoursAvailable * 0.6)) : dailyHoursAvailable,
            isGardeDay: isGardeDay,
            isDelayed: false,
            courseStatuses: {}
          });

          globalDayCounter++;
        }
      });

      const payloadToInsert = generatedTasks.map(t => ({
        id: t.id,
        user_id: userId,
        couche_id: t.coucheId,
        sub_period: t.subPeriod,
        day_number: t.dayNumber,
        date: t.date,
        module_name: t.moduleName,
        course_titles: t.courseTitles,
        estimated_hours: t.estimatedHours,
        is_garde_day: t.isGardeDay,
        is_delayed: t.isDelayed,
        course_statuses: t.courseStatuses
      }));

      if (payloadToInsert.length > 0) {
        await supabase.from('calendar_tasks').insert(payloadToInsert);
      }

      setMonthlyPlan(prev => [...prev.filter(p => p.coucheId !== couche), ...generatedTasks]);
      setShowSetupModal(false);
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setCoucheSelections(prev => {
      const current = [...(prev[currentCouche] || [])];
      const index = current.findIndex(item => item.moduleId === moduleId);
      
      if (index !== -1) {
        current[index] = { ...current[index], selected: !current[index].selected };
      } else {
        current.push({ moduleId, selected: true, orderIndex: current.length + 1 });
      }

      return { ...prev, [currentCouche]: current };
    });
  };

  const handleManualOrderChange = (moduleId: string, newOrder: number) => {
    setCoucheSelections(prev => {
      const current = [...(prev[currentCouche] || [])];
      const index = current.findIndex(item => item.moduleId === moduleId);
      if (index !== -1) {
        current[index] = { ...current[index], orderIndex: isNaN(newOrder) ? 1 : newOrder };
      }
      return { ...prev, [currentCouche]: current };
    });
  };

  const handleRemoveCourseFromDay = async (taskId: string, courseIdx: number) => {
    const task = monthlyPlan.find(t => t.id === taskId);
    if (!task) return;

    const updatedCourses = task.courseTitles.filter((_, idx) => idx !== courseIdx);

    try {
      await supabase
        .from('calendar_tasks')
        .update({ course_titles: updatedCourses })
        .eq('id', taskId);

      setMonthlyPlan(prev => prev.map(t => t.id === taskId ? { ...t, courseTitles: updatedCourses } : t));
    } catch (error) {
      console.error('Error removing course:', error);
    }
  };

  const handleAddCourseToDay = async (taskId: string) => {
    if (!newCourseTitle.trim()) return;
    const task = monthlyPlan.find(t => t.id === taskId);
    if (!task) return;

    const updatedCourses = [...task.courseTitles, newCourseTitle.trim()];

    try {
      await supabase
        .from('calendar_tasks')
        .update({ course_titles: updatedCourses })
        .eq('id', taskId);

      setMonthlyPlan(prev => prev.map(t => t.id === taskId ? { ...t, courseTitles: updatedCourses } : t));
      setNewCourseTitle('');
      setAddingTaskForDay(null);
    } catch (error) {
      console.error('Error adding course:', error);
    }
  };

  const handleUpdateCourseStatus = async (taskId: string, courseTitle: string, status: 'done' | 'delayed' | 'normal') => {
    const task = monthlyPlan.find(t => t.id === taskId);
    if (!task) return;

    const currentStatuses = task.courseStatuses || {};
    const updatedStatuses = { ...currentStatuses, [courseTitle]: currentStatuses[courseTitle] === status ? 'normal' : status };

    try {
      await supabase
        .from('calendar_tasks')
        .update({ course_statuses: updatedStatuses })
        .eq('id', taskId);

      setMonthlyPlan(prev => prev.map(t => t.id === taskId ? { ...t, courseStatuses: updatedStatuses } : t));
    } catch (error) {
      console.error('Error updating course status:', error);
    }
  };

  // البحث عن يوم تالٍ **في نفس الموديول فقط** حصرياً
  const findBestTargetTaskForModule = (currentTask: DailyTask) => {
    const sortedFutureTasks = monthlyPlan
      .filter(t => t.coucheId === currentTask.coucheId && t.moduleName === currentTask.moduleName && t.dayNumber > currentTask.dayNumber)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    for (const t of sortedFutureTasks) {
      const maxAllowedInTarget = t.isGardeDay ? 1 : (t.estimatedHours <= 3 ? 1 : (t.estimatedHours <= 6 ? 2 : 3));
      if (t.courseTitles.length < maxAllowedInTarget) {
        return t;
      }
    }

    return sortedFutureTasks[0] || null;
  };

  // معالجة Rediffuser مع قفل عدم خلط الموديولات
  const handleRefreshDelayedCourse = async (taskId: string, courseTitle: string) => {
    const currentTask = monthlyPlan.find(t => t.id === taskId);
    if (!currentTask) return;

    const updatedCourses = currentTask.courseTitles.filter(c => c !== courseTitle);
    const updatedStatuses = { ...(currentTask.courseStatuses || {}) };
    delete updatedStatuses[courseTitle];

    const targetTask = findBestTargetTaskForModule(currentTask);

    try {
      await supabase
        .from('calendar_tasks')
        .update({ course_titles: updatedCourses, course_statuses: updatedStatuses })
        .eq('id', taskId);

      if (targetTask) {
        const nextUpdatedCourses = [...targetTask.courseTitles, courseTitle];
        await supabase
          .from('calendar_tasks')
          .update({ course_titles: nextUpdatedCourses })
          .eq('id', targetTask.id);

        setMonthlyPlan(prev => prev.map(t => {
          if (t.id === taskId) return { ...t, courseTitles: updatedCourses, courseStatuses: updatedStatuses };
          if (t.id === targetTask.id) return { ...t, courseTitles: nextUpdatedCourses };
          return t;
        }));
      } else {
        // إنشاء يوم جديد **خاص بنفس الموديول حصرياً**
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;

        const newTaskPayload = {
          id: crypto.randomUUID(),
          user_id: userId,
          couche_id: currentTask.coucheId,
          sub_period: currentTask.subPeriod,
          day_number: currentTask.dayNumber + 1,
          date: currentTask.date,
          module_name: currentTask.moduleName, // نفس اسم الموديول الأصلي تماماً
          course_titles: [courseTitle],
          estimated_hours: dailyHoursAvailable,
          is_garde_day: false,
          is_delayed: true,
          course_statuses: {}
        };

        const { data: insertedData, error: insertError } = await supabase
          .from('calendar_tasks')
          .insert([newTaskPayload])
          .select()
          .single();

        if (!insertError && insertedData) {
          const newDailyTask: DailyTask = {
            id: insertedData.id,
            dayNumber: insertedData.day_number,
            date: insertedData.date,
            coucheId: insertedData.couche_id,
            subPeriod: insertedData.sub_period,
            moduleName: insertedData.module_name,
            courseTitles: insertedData.course_titles,
            estimatedHours: insertedData.estimated_hours,
            isGardeDay: insertedData.is_garde_day,
            isDelayed: insertedData.is_delayed,
            courseStatuses: {}
          };

          setMonthlyPlan(prev => [
            ...prev.map(t => t.id === taskId ? { ...t, courseTitles: updatedCourses, courseStatuses: updatedStatuses } : t),
            newDailyTask
          ]);
        }
      }
    } catch (error) {
      console.error('Error redistributing delayed course for module:', error);
    }
  };

  // معالجة زر إعادة الحساب الذكي للساعات والـ Garde مع عدم خلط الموديولات
  const handleRecalculateDay = async (taskId: string, newHours: number, isGarde: boolean) => {
    const task = monthlyPlan.find(t => t.id === taskId);
    if (!task) return;

    const allowedLimit = isGarde ? 1 : (newHours <= 3 ? 1 : (newHours <= 6 ? 2 : 3));
    
    let currentCourses = [...task.courseTitles];
    let overflowCourses: string[] = [];

    if (currentCourses.length > allowedLimit) {
      overflowCourses = currentCourses.slice(allowedLimit);
      currentCourses = currentCourses.slice(0, allowedLimit);
    }

    try {
      await supabase
        .from('calendar_tasks')
        .update({ 
          estimated_hours: newHours, 
          is_garde_day: isGarde,
          course_titles: currentCourses
        })
        .eq('id', taskId);

      if (overflowCourses.length > 0) {
        let targetTask = findBestTargetTaskForModule(task);

        if (targetTask) {
          const mergedCourses = [...targetTask.courseTitles, ...overflowCourses];
          await supabase
            .from('calendar_tasks')
            .update({ course_titles: mergedCourses })
            .eq('id', targetTask.id);

          setMonthlyPlan(prev => prev.map(t => {
            if (t.id === taskId) return { ...t, estimatedHours: newHours, isGardeDay: isGarde, courseTitles: currentCourses };
            if (t.id === targetTask.id) return { ...t, courseTitles: mergedCourses };
            return t;
          }));
          return;
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          const userId = user?.id || null;

          const newTaskPayload = {
            id: crypto.randomUUID(),
            user_id: userId,
            couche_id: task.coucheId,
            sub_period: task.subPeriod,
            day_number: task.dayNumber + 1,
            date: task.date,
            module_name: task.moduleName, // الحفاظ على اسم الموديول الأصلي
            course_titles: overflowCourses,
            estimated_hours: dailyHoursAvailable,
            is_garde_day: false,
            is_delayed: true,
            course_statuses: {}
          };

          const { data: insertedData, error: insertError } = await supabase
            .from('calendar_tasks')
            .insert([newTaskPayload])
            .select()
            .single();

          if (!insertError && insertedData) {
            const newDailyTask: DailyTask = {
              id: insertedData.id,
              dayNumber: insertedData.day_number,
              date: insertedData.date,
              coucheId: insertedData.couche_id,
              subPeriod: insertedData.sub_period,
              moduleName: insertedData.module_name,
              courseTitles: insertedData.course_titles,
              estimatedHours: insertedData.estimated_hours,
              isGardeDay: insertedData.is_garde_day,
              isDelayed: insertedData.is_delayed,
              courseStatuses: {}
            };

            setMonthlyPlan(prev => [
              ...prev.map(t => t.id === taskId ? { ...t, estimatedHours: newHours, isGardeDay: isGarde, courseTitles: currentCourses } : t),
              newDailyTask
            ]);
            return;
          }
        }
      }

      setMonthlyPlan(prev => prev.map(t => t.id === taskId ? { ...t, estimatedHours: newHours, isGardeDay: isGarde, courseTitles: currentCourses } : t));
    } catch (error) {
      console.error('Error recalculating day:', error);
    }
  };

  const filteredPlan = monthlyPlan.filter(item => item.coucheId === currentCouche && item.subPeriod === currentSubPeriod);
  const currentSelections = coucheSelections[currentCouche] || [];
  const maxPeriods = getMaxPeriodsForCouche(currentCouche);

  const allModulesWithSelectionState = modulesData.map(mod => {
    const sel = currentSelections.find(s => s.moduleId === mod.id) || { selected: true, orderIndex: 1 };
    return { mod, ...sel };
  }).sort((a, b) => {
    if (a.selected && !b.selected) return -1;
    if (!a.selected && b.selected) return 1;
    return a.orderIndex - b.orderIndex;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        جاري تحميل جدول الدراسات من قاعدة البيانات...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fadeIn p-6">
      
      {/* Header Banner & Couche Switcher */}
      <div className="bg-gradient-to-r from-indigo-600 to-lavender-600 text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/25 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide">
              {currentCouche === 1 ? `1ère Couche (${getMaxPeriodsForCouche(1)} Mois)` : currentCouche === 2 ? `2ème Couche (${getMaxPeriodsForCouche(2)} Mois)` : `3ème Couche (${getMaxPeriodsForCouche(3)} Mois)`}
            </span>
            <span className="bg-emerald-500/30 text-emerald-100 px-3 py-1 rounded-full text-xs font-semibold">
              Capacité : {dailyHoursAvailable}h / jour
            </span>
          </div>
          <h1 className="text-xl font-bold font-display">Programme d'Études & Répartition Intelligente</h1>
          <p className="text-xs text-lavender-100 opacity-90">Circulez librement entre les couches et personnalisez vos mois.</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex-wrap">
          <button 
            onClick={() => { setCurrentCouche(1); setCurrentSubPeriod(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentCouche === 1 ? 'bg-white text-indigo-900 shadow-sm' : 'text-white hover:bg-white/10'}`}
          >
            1ère Couche
          </button>
          <button 
            onClick={() => { setCurrentCouche(2); setCurrentSubPeriod(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentCouche === 2 ? 'bg-white text-indigo-900 shadow-sm' : 'text-white hover:bg-white/10'}`}
          >
            2ème Couche
          </button>
          <button 
            onClick={() => { setCurrentCouche(3); setCurrentSubPeriod(1); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${currentCouche === 3 ? 'bg-white text-indigo-900 shadow-sm' : 'text-white hover:bg-white/10'}`}
          >
            3ème Couche
          </button>
        </div>
      </div>

      {/* Action Bar & SubPeriod (Months) Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <span className="text-xs font-bold text-slate-700 dark:text-white whitespace-nowrap">Mois / Période :</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                onClick={() => setCurrentSubPeriod(pNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${currentSubPeriod === pNum ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              >
                Mois {pNum}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={() => setShowSetupModal(true)}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Configurer les Modules ({maxPeriods} Mois)
          </button>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center"
            title="Paramètres"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Daily Program List */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" /> Planning du Mois {currentSubPeriod} ({currentCouche === 1 ? '1ère Couche' : currentCouche === 2 ? '2ème Couche' : '3ème Couche'})
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {filteredPlan.length} Tâches planifiées
          </span>
        </div>

        <div className="space-y-3">
          {filteredPlan.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <p>Aucun programme généré pour ce mois.</p>
              <button 
                onClick={() => setShowSetupModal(true)}
                className="text-indigo-600 dark:text-indigo-400 font-bold underline"
              >
                Cliquez ici pour configurer et répartir vos modules.
              </button>
            </div>
          ) : (
            filteredPlan.map((dayItem) => (
              <div 
                key={dayItem.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 ${
                  dayItem.isGardeDay 
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' 
                    : 'bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
                      Jour {dayItem.dayNumber}
                    </span>
                    <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-xl text-xs font-bold">
                      {dayItem.moduleName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border shadow-xs">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <input 
                        type="number"
                        min={1}
                        max={16}
                        value={dayItem.estimatedHours}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMonthlyPlan(prev => prev.map(t => t.id === dayItem.id ? { ...t, estimatedHours: val } : t));
                        }}
                        className="w-8 text-xs font-bold bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none text-center"
                      />
                      <span className="text-[10px] text-slate-400">h</span>
                    </div>

                    <button
                      onClick={() => {
                        const newGarde = !dayItem.isGardeDay;
                        setMonthlyPlan(prev => prev.map(t => t.id === dayItem.id ? { ...t, isGardeDay: newGarde } : t));
                      }}
                      className={`text-[11px] px-3 py-1.5 rounded-xl font-bold shadow-xs transition-all ${
                        dayItem.isGardeDay ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {dayItem.isGardeDay ? 'Garde 🏥' : 'Jour normal'}
                    </button>

                    <button
                      onClick={() => handleRecalculateDay(dayItem.id, dayItem.estimatedHours, dayItem.isGardeDay)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
                      title="Recalculer et redistribuer sans mélanger les modules"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pl-1 space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-white flex justify-between items-center">
                    <span>📖 Leçons programmées :</span>
                    <button 
                      onClick={() => setAddingTaskForDay(addingTaskForDay === dayItem.id ? null : dayItem.id)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Plus className="w-3 h-3" /> Ajouter un cours
                    </button>
                  </div>

                  {dayItem.courseTitles.map((cTitle, idx) => {
                    const status = dayItem.courseStatuses?.[cTitle] || 'normal';
                    return (
                      <div key={idx} className={`flex items-center justify-between text-xs font-medium pl-3 py-1.5 rounded-r-xl pr-2 shadow-xs transition-all border-l-4 ${
                        status === 'done' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-200' 
                          : status === 'delayed' 
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-900 dark:text-rose-200' 
                          : 'bg-white dark:bg-slate-900 border-indigo-400 text-slate-700 dark:text-slate-300'
                      }`}>
                        <span className={`${status === 'done' ? 'line-through opacity-75' : ''}`}>
                          • {cTitle}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handleUpdateCourseStatus(dayItem.id, cTitle, 'done')}
                            className={`p-1 rounded-lg transition-all ${status === 'done' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-emerald-600'}`}
                            title="Marquer comme fait"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button 
                            onClick={() => handleUpdateCourseStatus(dayItem.id, cTitle, 'delayed')}
                            className={`p-1 rounded-lg transition-all ${status === 'delayed' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-600'}`}
                            title="Non réalisé / En retard"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {status === 'delayed' && (
                            <button 
                              onClick={() => handleRefreshDelayedCourse(dayItem.id, cTitle)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs"
                              title="Redistribuer dans le même module"
                            >
                              <RotateCw className="w-3 h-3" /> Rediffuser
                            </button>
                          )}

                          <button 
                            onClick={() => handleRemoveCourseFromDay(dayItem.id, idx)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 ml-1"
                            title="Supprimer ce cours"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {addingTaskForDay === dayItem.id && (
                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="text"
                        placeholder="Titre du nouveau cours..."
                        value={newCourseTitle}
                        onChange={(e) => setNewCourseTitle(e.target.value)}
                        className="flex-1 text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                      <button 
                        onClick={() => handleAddCourseToDay(dayItem.id)}
                        className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                      >
                        Valider
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Setup Modules & Manual Priority */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Configuration des Modules ({currentCouche === 1 ? '1ère Couche' : currentCouche === 2 ? '2ème Couche' : '3ème Couche'})
            </h3>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-white">Nombre de mois pour cette couche :</span>
              <input 
                type="number"
                min={1}
                max={12}
                value={maxPeriods}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setCoucheMaxPeriods(prev => ({ ...prev, [currentCouche]: val }));
                  if (currentSubPeriod > val) setCurrentSubPeriod(val);
                }}
                className="w-16 text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-bold text-slate-800 dark:text-white"
              />
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cochez vos modules et écrivez manuellement le numéro de l'ordre de priorité (1, 2, 3...) pour chacun.
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {allModulesWithSelectionState.map((item) => (
                <div 
                  key={item.mod.id} 
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all gap-3 ${
                    item.selected 
                      ? 'bg-indigo-50/50 dark:bg-slate-800 border-indigo-200 dark:border-indigo-900' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-50'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleModuleSelection(item.mod.id)}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white">{item.mod.name}</div>
                      <div className="text-[10px] text-slate-400">{item.mod.lessons?.length || 0} leçons</div>
                    </div>
                  </label>

                  {item.selected && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Ordre :</span>
                      <input 
                        type="number"
                        min={1}
                        value={item.orderIndex}
                        onChange={(e) => handleManualOrderChange(item.mod.id, parseInt(e.target.value) || 1)}
                        className="w-14 text-xs p-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-bold text-slate-800 dark:text-white shadow-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => generateDynamicPlanForCouche(currentCouche)}
                disabled={isGenerating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? <span>Répartition en cours...</span> : <>Lancer la répartition sur les {maxPeriods} mois</>}
              </button>
              <button 
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Settings */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Paramètres de Capacité Quotidienne</h3>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-200 mb-1.5 block">
                Heures de travail disponibles par jour
              </label>
              <input
                type="number"
                value={dailyHoursAvailable}
                onChange={(e) => setDailyHoursAvailable(Number(e.target.value))}
                className="w-full text-sm p-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button onClick={() => setShowSettingsModal(false)} className="w-full bg-indigo-600 text-white p-3 rounded-2xl text-sm font-bold">
              Enregistrer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}