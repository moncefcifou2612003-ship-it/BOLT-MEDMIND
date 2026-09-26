import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, ChevronDown, ChevronUp, Check, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase'; // تأكد بلي المسار صحيح نحو ملف الـ supabase client تاعك

export interface LessonItem {
  id: string;
  title: string;
  importance: 'important' | 'moyen' | 'moins';
  difficulty?: 'facile' | 'moyen' | 'difficile';
  c1: boolean;
  c2: boolean;
  c3: boolean;
  q1: boolean;
  q2: boolean;
  q3: boolean;
  resume: boolean;
}

export interface ModuleItem {
  id: string;
  name: string;
  category: 'biologique' | 'clinique';
  importance: 'important' | 'moyen' | 'moins';
  difficulty?: 'facile' | 'moyen' | 'difficile';
  lessons: LessonItem[];
}

export function CoursModulesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'biologique' | 'clinique'>('all');
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const getImportanceWeight = (importance: 'important' | 'moyen' | 'moins') => {
    switch (importance) {
      case 'important': return 3;
      case 'moyen': return 2;
      case 'moins': return 1;
      default: return 2;
    }
  };

  // جلب البيانات من Supabase عند الفتح مع دعم الـ Test Account والـ user_id
  const fetchModulesAndLessons = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      let modulesQuery = supabase.from('modules').select('*');
      if (userId) {
        modulesQuery = modulesQuery.eq('user_id', userId);
      }
      const { data: modulesData, error: modulesError } = await modulesQuery;
      if (modulesError) throw modulesError;

      let lessonsQuery = supabase.from('lessons').select('*');
      if (userId) {
        lessonsQuery = lessonsQuery.eq('user_id', userId);
      }
      const { data: lessonsData, error: lessonsError } = await lessonsQuery;
      if (lessonsError) throw lessonsError;

      const formattedModules: ModuleItem[] = (modulesData || []).map((mod: any) => ({
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
            difficulty: l.difficulty || undefined,
            c1: l.c1,
            c2: l.c2,
            c3: l.c3,
            q1: l.q1,
            q2: l.q2,
            q3: l.q3,
            resume: l.resume
          }))
          .sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance))
      })).sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance));

      setModules(formattedModules);
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModulesAndLessons();
  }, []);

  // إرسال إشارة التحديث لباقي المكونات
  const notifyModulesChanged = (updatedModules: ModuleItem[]) => {
    window.dispatchEvent(new CustomEvent('medmind_modules_changed', { detail: updatedModules }));
  };

  const [expandedId, setExpandedId] = useState<string | null>('1');
  
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleCategory, setNewModuleCategory] = useState<'biologique' | 'clinique'>('clinique');
  const [newModuleImportance, setNewModuleImportance] = useState<'important' | 'moyen' | 'moins'>('important');
  const [newModuleDifficulty, setNewModuleDifficulty] = useState<'facile' | 'moyen' | 'difficile' | ''>('');

  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; lesson: LessonItem } | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonImportance, setNewLessonImportance] = useState<'important' | 'moyen' | 'moins'>('important');
  const [newLessonDifficulty, setNewLessonDifficulty] = useState<'facile' | 'moyen' | 'difficile' | ''>('');

  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      if (editingModuleId) {
        const { error } = await supabase
          .from('modules')
          .update({
            name: newModuleName,
            category: newModuleCategory,
            importance: newModuleImportance,
            difficulty: newModuleDifficulty || null
          })
          .eq('id', editingModuleId);

        if (error) throw error;

        const updated = modules.map(mod => {
          if (mod.id === editingModuleId) {
            return {
              ...mod,
              name: newModuleName,
              category: newModuleCategory,
              importance: newModuleImportance,
              difficulty: newModuleDifficulty || undefined
            };
          }
          return mod;
        }).sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance));

        setModules(updated);
        notifyModulesChanged(updated);
        setEditingModuleId(null);
      } else {
        const newId = crypto.randomUUID();
        const newModPayload = {
          id: newId,
          user_id: userId,
          name: newModuleName,
          category: newModuleCategory,
          importance: newModuleImportance,
          difficulty: newModuleDifficulty || null
        };

        const { error } = await supabase.from('modules').insert([newModPayload]);
        if (error) throw error;

        const newMod: ModuleItem = {
          id: newId,
          name: newModuleName,
          category: newModuleCategory,
          importance: newModuleImportance,
          difficulty: newModuleDifficulty || undefined,
          lessons: []
        };

        const updated = [...modules, newMod].sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance));
        setModules(updated);
        notifyModulesChanged(updated);
        setIsAddingModule(false);
      }

      setNewModuleName('');
      setNewModuleImportance('important');
      setNewModuleDifficulty('');
    } catch (error) {
      console.error('Error saving module:', error);
    }
  };

  const startEditModule = (module: ModuleItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingModuleId(module.id);
    setNewModuleName(module.name);
    setNewModuleCategory(module.category);
    setNewModuleImportance(module.importance);
    setNewModuleDifficulty(module.difficulty || '');
    setIsAddingModule(true);
  };

  const handleDeleteModule = async (moduleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('هل أنت متأكد من حذف هذا الموديل وكل الدروس التابعة له؟')) {
      try {
        const { error } = await supabase.from('modules').delete().eq('id', moduleId);
        if (error) throw error;

        const updated = modules.filter(m => m.id !== moduleId);
        setModules(updated);
        notifyModulesChanged(updated);
      } catch (error) {
        console.error('Error deleting module:', error);
      }
    }
  };

  const handleSaveLesson = async (moduleId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      if (editingLesson) {
        const lessonId = editingLesson.lesson.id;
        const { error } = await supabase
          .from('lessons')
          .update({
            title: newLessonTitle,
            importance: newLessonImportance,
            difficulty: newLessonDifficulty || null
          })
          .eq('id', lessonId);

        if (error) throw error;

        const updated = modules.map(mod => {
          if (mod.id === moduleId) {
            const updatedLessons = mod.lessons.map(l => {
              if (l.id === lessonId) {
                return {
                  ...l,
                  title: newLessonTitle,
                  importance: newLessonImportance,
                  difficulty: newLessonDifficulty || undefined
                };
              }
              return l;
            });
            return {
              ...mod,
              lessons: updatedLessons.sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance))
            };
          }
          return mod;
        });

        setModules(updated);
        notifyModulesChanged(updated);
      } else {
        const newLessonId = crypto.randomUUID();
        const lessonPayload = {
          id: newLessonId,
          user_id: userId,
          module_id: moduleId,
          title: newLessonTitle,
          importance: newLessonImportance,
          difficulty: newLessonDifficulty || null,
          c1: false, c2: false, c3: false,
          q1: false, q2: false, q3: false,
          resume: false
        };

        const { error } = await supabase.from('lessons').insert([lessonPayload]);
        if (error) throw error;

        const newLessonItem: LessonItem = {
          id: newLessonId,
          title: newLessonTitle,
          importance: newLessonImportance,
          difficulty: newLessonDifficulty || undefined,
          c1: false, c2: false, c3: false,
          q1: false, q2: false, q3: false,
          resume: false
        };

        const updated = modules.map(mod => {
          if (mod.id === moduleId) {
            const updatedLessons = [...mod.lessons, newLessonItem];
            return {
              ...mod,
              lessons: updatedLessons.sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance))
            };
          }
          return mod;
        });

        setModules(updated);
        notifyModulesChanged(updated);
      }

      resetLessonForm();
    } catch (error) {
      console.error('Error saving lesson:', error);
    }
  };

  const startEditLesson = (moduleId: string, lesson: LessonItem) => {
    setEditingLesson({ moduleId, lesson });
    setNewLessonTitle(lesson.title);
    setNewLessonImportance(lesson.importance);
    setNewLessonDifficulty(lesson.difficulty || '');
    setAddingLessonToModuleId(moduleId);
  };

  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
      try {
        const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
        if (error) throw error;

        const updated = modules.map(mod => {
          if (mod.id === moduleId) {
            return {
              ...mod,
              lessons: mod.lessons.filter(l => l.id !== lessonId)
            };
          }
          return mod;
        });

        setModules(updated);
        notifyModulesChanged(updated);
      } catch (error) {
        console.error('Error deleting lesson:', error);
      }
    }
  };

  const resetLessonForm = () => {
    setNewLessonTitle('');
    setNewLessonImportance('important');
    setNewLessonDifficulty('');
    setAddingLessonToModuleId(null);
    setEditingLesson(null);
  };

  const toggleLessonCheck = async (moduleId: string, lessonId: string, field: keyof LessonItem) => {
    const targetModule = modules.find(m => m.id === moduleId);
    const targetLesson = targetModule?.lessons.find(l => l.id === lessonId);
    if (!targetLesson) return;

    const newValue = !targetLesson[field];

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ [field]: newValue })
        .eq('id', lessonId);

      if (error) throw error;

      const updated = modules.map(mod => {
        if (mod.id === moduleId) {
          return {
            ...mod,
            lessons: mod.lessons.map(lesson => {
              if (lesson.id === lessonId) {
                return { ...lesson, [field]: newValue };
              }
              return lesson;
            })
          };
        }
        return mod;
      });

      setModules(updated);
      notifyModulesChanged(updated);
    } catch (error) {
      console.error('Error updating check state:', error);
    }
  };

  const calculateModuleProgress = (lessons: LessonItem[]) => {
    if (lessons.length === 0) return 0;
    
    let totalMaxScore = 0;
    let earnedScore = 0;

    lessons.forEach(l => {
      const weight = getImportanceWeight(l.importance);
      const lessonMaxScore = 7 * weight; 
      totalMaxScore += lessonMaxScore;

      let lessonEarned = 0;
      if (l.c1) lessonEarned += weight;
      if (l.c2) lessonEarned += weight;
      if (l.c3) lessonEarned += weight;
      if (l.q1) lessonEarned += weight;
      if (l.q2) lessonEarned += weight;
      if (l.q3) lessonEarned += weight;
      if (l.resume) lessonEarned += weight;

      earnedScore += lessonEarned;
    });

    if (totalMaxScore === 0) return 0;
    return Math.round((earnedScore / totalMaxScore) * 100);
  };

  const filteredModules = (activeTab === 'all' 
    ? modules 
    : modules.filter(m => m.category === activeTab)
  ).sort((a, b) => getImportanceWeight(b.importance) - getImportanceWeight(a.importance));

  const getImportanceBadge = (importance: 'important' | 'moyen' | 'moins', isModule = false) => {
    const sizeClasses = isModule ? "text-[10px] px-2 py-0.5" : "text-[9px] px-1.5 py-0.5";
    switch (importance) {
      case 'important':
        return <span className={`${sizeClasses} rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-medium`}>Important</span>;
      case 'moyen':
        return <span className={`${sizeClasses} rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-medium`}>Moyen</span>;
      case 'moins':
        return <span className={`${sizeClasses} rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium`}>Moins</span>;
    }
  };

  const getDifficultyBadge = (difficulty?: 'facile' | 'moyen' | 'difficile', isModule = false) => {
    if (!difficulty) return null;
    const sizeClasses = isModule ? "text-[10px] px-2 py-0.5" : "text-[9px] px-1.5 py-0.5";
    switch (difficulty) {
      case 'difficile':
        return <span className={`${sizeClasses} rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-medium`}>Difficile</span>;
      case 'moyen':
        return <span className={`${sizeClasses} rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium`}>Intermédiaire</span>;
      case 'facile':
        return <span className={`${sizeClasses} rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-medium`}>Facile</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        جاري تحميل البيانات من قاعدة البيانات...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Modules</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Shared master curriculum & smart planning setup</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'all' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Tous ({modules.length})
            </button>
            <button 
              onClick={() => setActiveTab('biologique')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'biologique' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Biologique
            </button>
            <button 
              onClick={() => setActiveTab('clinique')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeTab === 'clinique' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Clinique
            </button>
          </div>

          <button 
            onClick={() => {
              setEditingModuleId(null);
              setNewModuleName('');
              setNewModuleImportance('important');
              setNewModuleDifficulty('');
              setIsAddingModule(!isAddingModule);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Module
          </button>
        </div>
      </div>

      {isAddingModule && (
        <form onSubmit={handleSaveModule} className="mb-6 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-indigo-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center">
          <input 
            type="text" 
            placeholder="Nom du module..." 
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-sm focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
            autoFocus
          />
          <select 
            value={newModuleCategory}
            onChange={(e) => setNewModuleCategory(e.target.value as any)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-white w-full sm:w-auto"
          >
            <option value="clinique">Clinique</option>
            <option value="biologique">Biologique</option>
          </select>

          <select 
            value={newModuleImportance}
            onChange={(e) => setNewModuleImportance(e.target.value as any)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-white w-full sm:w-auto"
          >
            <option value="important">Important</option>
            <option value="moyen">Moyen</option>
            <option value="moins">Moins important</option>
          </select>

          <select 
            value={newModuleDifficulty}
            onChange={(e) => setNewModuleDifficulty(e.target.value as any)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-white w-full sm:w-auto"
          >
            <option value="">Aucune</option>
            <option value="difficile">Difficile</option>
            <option value="moyen">Intermédiaire</option>
            <option value="facile">Facile</option>
          </select>

          <div className="flex gap-2 w-full sm:w-auto">
            <button type="submit" className="flex-1 sm:flex-none bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
              {editingModuleId ? 'Modifier' : 'Ajouter'}
            </button>
            <button type="button" onClick={() => { setIsAddingModule(false); setEditingModuleId(null); }} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">Annuler</button>
          </div>
        </form>
      )}

      {filteredModules.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">No modules yet.</h3>
          <p className="text-sm text-slate-400">Click "Add Module" to create the shared curriculum.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredModules.map(module => {
            const progress = calculateModuleProgress(module.lessons);
            const sortedLessons = [...module.lessons].sort((a, b) => 
              getImportanceWeight(b.importance) - getImportanceWeight(a.importance)
            );

            return (
              <div key={module.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition">
                <div 
                  onClick={() => setExpandedId(expandedId === module.id ? null : module.id)}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{module.name}</h3>
                        {getImportanceBadge(module.importance, true)}
                        {getDifficultyBadge(module.difficulty, true)}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {module.category} • {module.lessons.length} cours
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    <div className="flex flex-col items-end w-36 sm:w-44">
                      <div className="flex justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        <span>Progression</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ps-4 border-s border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button 
                          onClick={(e) => startEditModule(module, e)}
                          title="Modifier le module"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition rounded-lg hover:bg-white dark:hover:bg-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteModule(module.id, e)}
                          title="Supprimer le module"
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition rounded-lg hover:bg-white dark:hover:bg-slate-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {expandedId === module.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {expandedId === module.id && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 space-y-3">
                    {sortedLessons.map(lesson => (
                      <div key={lesson.id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-700 dark:text-slate-200 text-xs">{lesson.title}</span>
                          {getImportanceBadge(lesson.importance, false)}
                          {getDifficultyBadge(lesson.difficulty, false)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Couches</span>
                              <div className="flex items-center gap-1">
                                {(['c1', 'c2', 'c3'] as const).map((step, idx) => (
                                  <button 
                                    key={step}
                                    onClick={() => toggleLessonCheck(module.id, lesson.id, step)}
                                    title={`Couche ${idx+1}`}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold transition ${lesson[step] ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}
                                  >
                                    {lesson[step] ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx+1}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">QCMs</span>
                              <div className="flex items-center gap-1">
                                {(['q1', 'q2', 'q3'] as const).map((qStep, idx) => (
                                  <button 
                                    key={qStep}
                                    onClick={() => toggleLessonCheck(module.id, lesson.id, qStep)}
                                    title={`QCM ${idx+1}`}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold transition ${lesson[qStep] ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}
                                  >
                                    {lesson[qStep] ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx+1}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Résumé</span>
                              <button 
                                onClick={() => toggleLessonCheck(module.id, lesson.id, 'resume')}
                                title="Résumé (R)"
                                className={`w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold transition ${lesson.resume ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'}`}
                              >
                                {lesson.resume ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : 'R'}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 border-s ps-3 border-slate-200 dark:border-slate-800">
                            <button 
                              onClick={() => startEditLesson(module.id, lesson)}
                              title="Modifier le cours"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLesson(module.id, lesson.id)}
                              title="Supprimer le cours"
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {addingLessonToModuleId === module.id ? (
                      <form onSubmit={(e) => handleSaveLesson(module.id, e)} className="flex flex-col sm:flex-row gap-2 mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-800 items-center">
                        <input 
                          type="text" 
                          placeholder="Titre du cours..." 
                          value={newLessonTitle}
                          onChange={(e) => setNewLessonTitle(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white text-xs focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
                          autoFocus
                        />
                        
                        <select 
                          value={newLessonImportance}
                          onChange={(e) => setNewLessonImportance(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-white w-full sm:w-auto"
                        >
                          <option value="important">Important</option>
                          <option value="moyen">Moyen</option>
                          <option value="moins">Moins important</option>
                        </select>

                        <select 
                          value={newLessonDifficulty}
                          onChange={(e) => setNewLessonDifficulty(e.target.value as any)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 dark:text-white w-full sm:w-auto"
                        >
                          <option value="">Aucune</option>
                          <option value="difficile">Difficile</option>
                          <option value="moyen">Intermédiaire</option>
                          <option value="facile">Facile</option>
                        </select>

                        <div className="flex gap-2 w-full sm:w-auto">
                          <button type="submit" className="flex-1 sm:flex-none bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium">
                            {editingLesson ? 'Modifier' : 'Ajouter'}
                          </button>
                          <button type="button" onClick={resetLessonForm} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">Annuler</button>
                        </div>
                      </form>
                    ) : (
                      <button 
                        onClick={() => { resetLessonForm(); setAddingLessonToModuleId(module.id); }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ajouter un cours
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}