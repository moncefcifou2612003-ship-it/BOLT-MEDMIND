import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { Flashcard, Module, Lesson } from '@/lib/types';
import {
  Layers, Plus, Trash2, Search, ChevronLeft, RotateCw, Check, X, BookOpen, Edit3,
} from 'lucide-react';

export function FlashcardsHubPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState('');
  
  // Filters state
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterLesson, setFilterLesson] = useState<string>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({ question: '', answer: '', lessonId: '', moduleId: '' });
  
  // Edit state
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);

  const [loading, setLoading] = useState(true);

  // Study mode
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);

  const fetchFlashcards = useCallback(async () => {
    let query = supabase.from('flashcards').select('*').order('created_at', { ascending: false });
    if (profile?.id) {
      query = query.or(`user_id.eq.${profile.id},user_id.is.null`);
    }
    const { data, error } = await query;
    if (error) console.error(error.message);
    if (data) setFlashcards(data as Flashcard[]);
  }, [profile]);

  const fetchModules = useCallback(async () => {
    const { data } = await supabase.from('modules').select('*').order('name');
    if (data) setModules(data as Module[]);
  }, []);

  const fetchLessons = useCallback(async () => {
    const { data } = await supabase.from('lessons').select('*').order('title');
    if (data) setLessons(data as Lesson[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchFlashcards(), fetchModules(), fetchLessons()]).finally(() => setLoading(false));
  }, [fetchFlashcards, fetchModules, fetchLessons]);

  const addFlashcard = async () => {
    if (!newCard.question.trim() || !newCard.answer.trim()) return;
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: profile?.id || null,
        question: newCard.question,
        answer: newCard.answer,
        lesson_id: newCard.lessonId || null,
        module_id: newCard.moduleId || null,
      })
      .select()
      .single();
    if (error) { showToast(error.message, 'error'); return; }
    if (data) setFlashcards((prev) => [data as Flashcard, ...prev]);
    setNewCard({ question: '', answer: '', lessonId: '', moduleId: '' });
    setShowAddModal(false);
    showToast('Flashcard added successfully', 'success');
  };

  const updateFlashcard = async () => {
    if (!editingCard || !editingCard.question.trim() || !editingCard.answer.trim()) return;
    const { error } = await supabase
      .from('flashcards')
      .update({
        question: editingCard.question,
        answer: editingCard.answer,
        lesson_id: editingCard.lesson_id || null,
        module_id: editingCard.module_id || null,
      })
      .eq('id', editingCard.id);

    if (error) { showToast(error.message, 'error'); return; }
    setFlashcards((prev) => prev.map((f) => f.id === editingCard.id ? editingCard : f));
    setEditingCard(null);
    showToast('Flashcard updated successfully', 'success');
  };

  const deleteFlashcard = async (id: string) => {
    await supabase.from('flashcards').delete().eq('id', id);
    setFlashcards((prev) => prev.filter((f) => f.id !== id));
    showToast('Flashcard deleted', 'info');
  };

  // تصفية البطاقات بناءً على البحث، الموديول، والدرس
  const filteredCards = flashcards.filter((c) => {
    if (filterModule !== 'all' && c.module_id !== filterModule) return false;
    if (filterLesson !== 'all' && c.lesson_id !== filterLesson) return false;
    if (search && !c.question.toLowerCase().includes(search.toLowerCase()) && !c.answer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const startStudy = () => {
    if (filteredCards.length === 0) {
      showToast('No flashcards available to study', 'info');
      return;
    }
    setStudyMode(true);
    setStudyIndex(0);
    setShowAnswer(false);
    setKnownCount(0);
    setUnknownCount(0);
  };

  const markCard = (known: boolean) => {
    const nextKnown = known ? knownCount + 1 : knownCount;
    const nextUnknown = !known ? unknownCount + 1 : unknownCount;
    if (known) setKnownCount(nextKnown);
    else setUnknownCount(nextUnknown);

    if (studyIndex < filteredCards.length - 1) {
      setStudyIndex((i) => i + 1);
      setShowAnswer(false);
    } else {
      setStudyMode(false);
      showToast(`Study session complete! ${nextKnown}/${filteredCards.length} known`, 'success');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Layers className="w-8 h-8 text-lavender-500 animate-pulse-soft" /></div>;
  }

  // Study mode view
  if (studyMode && filteredCards.length > 0) {
    const card = filteredCards[studyIndex];
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setStudyMode(false)} className="clay-button-secondary text-sm flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Exit
            </button>
            <span className="text-sm text-slateindigo-400 font-medium">
              {studyIndex + 1} / {filteredCards.length}
            </span>
            <div className="flex gap-2">
              <span className="pill-badge bg-mint-500/15 text-mint-600">{knownCount} ✓</span>
              <span className="pill-badge bg-coral-500/15 text-coral-600">{unknownCount} ✗</span>
            </div>
          </div>

          <div
            className="clay-card p-8 min-h-[300px] flex flex-col items-center justify-center cursor-pointer select-none"
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {!showAnswer ? (
              <>
                <p className="text-xs text-slateindigo-400 mb-4 uppercase tracking-wide">Question</p>
                <p className="text-xl font-display font-semibold text-slateindigo-800 dark:text-slateindigo-50 text-center">
                  {card.question}
                </p>
                <p className="text-xs text-lavender-500 mt-6 animate-pulse-soft">Click to reveal answer</p>
              </>
            ) : (
              <>
                <p className="text-xs text-mint-500 mb-4 uppercase tracking-wide">Answer</p>
                <p className="text-xl text-slateindigo-700 dark:text-slateindigo-100 text-center">
                  {card.answer}
                </p>
              </>
            )}
          </div>

          {showAnswer && (
            <div className="flex gap-3 mt-4 animate-slide-up">
              <button onClick={() => markCard(false)} className="flex-1 py-4 rounded-2xl bg-coral-500/15 text-coral-600 font-semibold flex items-center justify-center gap-2 hover:bg-coral-500/25 transition-all active:scale-95">
                <X className="w-5 h-5" /> Don't Know
              </button>
              <button onClick={() => markCard(true)} className="flex-1 py-4 rounded-2xl bg-mint-500/15 text-mint-600 font-semibold flex items-center justify-center gap-2 hover:bg-mint-500/25 transition-all active:scale-95">
                <Check className="w-5 h-5" /> Got It
              </button>
            </div>
          )}

          <div className="mt-4 h-2 rounded-full bg-lavender-100 dark:bg-slateindigo-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-lavender-500 to-lavender-600 rounded-full transition-all"
              style={{ width: `${((studyIndex + 1) / filteredCards.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center">
            <Layers className="w-6 h-6 text-lavender-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
              {flashcards.length} Flashcards
            </h2>
            <p className="text-xs text-slateindigo-400">Active recall study system</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={startStudy} className="clay-button-secondary flex items-center gap-1">
            <RotateCw className="w-4 h-4" /> Study
          </button>
          <button onClick={() => setShowAddModal(true)} className="clay-button flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Card
          </button>
        </div>
      </div>

      {/* Filters: Search, Modules, and Lessons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slateindigo-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flashcards..."
            className="clay-input pl-10"
          />
        </div>
        
        {/* فلتر الموديولات */}
        <select
          value={filterModule}
          onChange={(e) => {
            setFilterModule(e.target.value);
            setFilterLesson('all'); // إعادة تعيين الدرس عند تغيير الموديول لتفادي تضارب الفلترة
          }}
          className="clay-input sm:w-48"
        >
          <option value="all">All modules</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        {/* فلتر الدروس الجديد (All Lessons) */}
        <select
          value={filterLesson}
          onChange={(e) => setFilterLesson(e.target.value)}
          className="clay-input sm:w-48"
        >
          <option value="all">All lessons</option>
          {lessons
            .filter((l) => filterModule === 'all' || l.module_id === filterModule)
            .map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
        </select>
      </div>

      {/* Flashcards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.length === 0 ? (
          <div className="col-span-full clay-card p-12 text-center">
            <Layers className="w-12 h-12 text-lavender-300 mx-auto mb-3" />
            <p className="text-slateindigo-400">No flashcards found matching your filters.</p>
          </div>
        ) : (
          filteredCards.map((card) => {
            const lesson = lessons.find((l) => l.id === card.lesson_id);
            const module = modules.find((m) => m.id === card.module_id);
            return (
              <div key={card.id} className="clay-card p-5 animate-slide-up group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="pill-badge bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300">
                      Q
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingCard(card)}
                        className="p-1.5 rounded-lg text-lavender-600 hover:bg-lavender-500/10"
                        title="Edit Flashcard"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteFlashcard(card.id)}
                        className="p-1.5 rounded-lg text-coral-500 hover:bg-coral-500/10"
                        title="Delete Flashcard"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slateindigo-800 dark:text-slateindigo-50 mb-3">{card.question}</p>
                  <div className="border-t border-lavender-100 dark:border-lavender-700/20 pt-3 mb-3">
                    <p className="text-xs text-slateindigo-400 mb-1">Answer</p>
                    <p className="text-sm text-slateindigo-600 dark:text-slateindigo-200">{card.answer}</p>
                  </div>
                </div>
                {(module || lesson) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-lavender-100/50 text-xs text-slateindigo-400">
                    {module && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {module.name}</span>}
                    {lesson && <span className="truncate">· {lesson.title}</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slateindigo-900/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg clay-card p-6 animate-scale-in">
            <h2 className="text-xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50 mb-4">Add Flashcard</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Question</label>
                <textarea
                  value={newCard.question}
                  onChange={(e) => setNewCard((prev) => ({ ...prev, question: e.target.value }))}
                  className="clay-input min-h-[80px]"
                  placeholder="What is the main cause of..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Answer</label>
                <textarea
                  value={newCard.answer}
                  onChange={(e) => setNewCard((prev) => ({ ...prev, answer: e.target.value }))}
                  className="clay-input min-h-[80px]"
                  placeholder="The main cause is..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newCard.lessonId}
                  onChange={(e) => {
                    const selectedLessonId = e.target.value;
                    const foundLesson = lessons.find((l) => l.id === selectedLessonId);
                    setNewCard((prev) => ({
                      ...prev,
                      lessonId: selectedLessonId,
                      moduleId: foundLesson ? foundLesson.module_id : prev.moduleId,
                    }));
                  }}
                  className="clay-input"
                >
                  <option value="">No lesson</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>

                <select
                  value={newCard.moduleId}
                  onChange={(e) => setNewCard((prev) => ({ ...prev, moduleId: e.target.value }))}
                  className="clay-input"
                >
                  <option value="">No module</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <button onClick={addFlashcard} className="clay-button w-full">Add Flashcard</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slateindigo-900/30 backdrop-blur-sm" onClick={() => setEditingCard(null)} />
          <div className="relative w-full max-w-lg clay-card p-6 animate-scale-in">
            <h2 className="text-xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50 mb-4">Edit Flashcard</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Question</label>
                <textarea
                  value={editingCard.question}
                  onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
                  className="clay-input min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Answer</label>
                <textarea
                  value={editingCard.answer}
                  onChange={(e) => setEditingCard({ ...editingCard, answer: e.target.value })}
                  className="clay-input min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editingCard.lesson_id || ''}
                  onChange={(e) => {
                    const selectedLessonId = e.target.value;
                    const foundLesson = lessons.find((l) => l.id === selectedLessonId);
                    setEditingCard({
                      ...editingCard,
                      lesson_id: selectedLessonId,
                      module_id: foundLesson ? foundLesson.module_id : editingCard.module_id,
                    });
                  }}
                  className="clay-input"
                >
                  <option value="">No lesson</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>

                <select
                  value={editingCard.module_id || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, module_id: e.target.value })}
                  className="clay-input"
                >
                  <option value="">No module</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <button onClick={updateFlashcard} className="clay-button w-full">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}