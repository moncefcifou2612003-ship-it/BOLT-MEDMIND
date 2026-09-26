import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { CriticalNote, NoteTag, Module, Lesson } from '@/lib/types';
import {
  Lightbulb, Plus, Search, Trash2, Flame, BookOpen, Zap, Layers, Edit3,
} from 'lucide-react';

const TAG_CONFIG: Record<NoteTag, { label: string; color: string; emoji: string }> = {
  piege: { label: 'Piège', color: 'coral', emoji: '⚠️' },
  tombable: { label: 'Tombable', color: 'coral', emoji: '🔥' },
  definition: { label: 'Définition', color: 'lavender', emoji: '📖' },
  autre: { label: 'Autre', color: 'mint', emoji: '📌' },
};

export function NotesVaultPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<CriticalNote[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<NoteTag | 'all'>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [newNote, setNewNote] = useState({ content: '', tag: 'piege' as NoteTag, lessonId: '', moduleId: '' });
  const [loading, setLoading] = useState(true);
  const [flashcardQuiz, setFlashcardQuiz] = useState<{ note: CriticalNote; answer: string } | null>(null);

  // Edit Note State
  const [editingNote, setEditingNote] = useState<CriticalNote | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      let query = supabase.from('notes_importantes').select('*').order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }
      if (data) setNotes(data as CriticalNote[]);
    } catch (err) {
      console.error('Exception fetching notes:', err);
    }
  }, [profile?.id]);

  const fetchModules = useCallback(async () => {
    const { data } = await supabase.from('modules').select('*').order('name');
    if (data) setModules(data as Module[]);
  }, []);

  const fetchLessons = useCallback(async () => {
    const { data } = await supabase.from('lessons').select('*').order('title');
    if (data) setLessons(data as Lesson[]);
  }, []);

  useEffect(() => {
    Promise.all([fetchNotes(), fetchModules(), fetchLessons()]).finally(() => setLoading(false));
  }, [fetchNotes, fetchModules, fetchLessons]);

  const addNote = async () => {
    if (!newNote.content.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;
      const generatedId = Date.now().toString();

      const { data, error } = await supabase
        .from('notes_importantes')
        .insert({
          id: generatedId,
          user_id: userId,
          title: newNote.content.slice(0, 30) + '...',
          content: newNote.content,
          tag: newNote.tag,
          lesson_id: newNote.lessonId || null,
          module_id: newNote.moduleId || null,
          date: new Date().toLocaleDateString('fr-FR')
        })
        .select()
        .single();

      if (error) { 
        showToast(error.message, 'error'); 
        return; 
      }

      setNotes((prev) => [data as CriticalNote, ...prev]);
      setNewNote({ content: '', tag: 'piege', lessonId: '', moduleId: '' });
      showToast('Note saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error saving note', 'error');
    }
  };

  // وظيفة تحديث الملاحظة في قاعدة البيانات
  const updateNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return;
    try {
      const { error } = await supabase
        .from('notes_importantes')
        .update({
          content: editingNote.content,
          title: editingNote.content.slice(0, 30) + '...',
          tag: editingNote.tag,
          lesson_id: editingNote.lesson_id || null,
          module_id: editingNote.module_id || null,
        })
        .eq('id', editingNote.id);

      if (error) {
        showToast(error.message, 'error');
        return;
      }

      setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? editingNote : n)));
      setEditingNote(null);
      showToast('Note updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating note', 'error');
    }
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes_importantes').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast('Note deleted', 'info');
  };

  const generateFlashcard = async (note: CriticalNote) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      const answer = note.content; // تم تعديلها سابقاً لتنتقل للإجابة مباشرة
      const question = ""; 
      
      const { error } = await supabase.from('flashcards').insert({
        user_id: userId,
        lesson_id: note.lesson_id,
        module_id: note.module_id,
        question,
        answer,
      });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Converted to Flashcard! Add your question.', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredNotes = notes.filter((n) => {
    if (filterTag !== 'all' && n.tag !== filterTag) return false;
    if (filterModule !== 'all' && n.module_id !== filterModule) return false;
    if (search && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Lightbulb className="w-8 h-8 text-lavender-500 animate-pulse-soft" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick add bar */}
      <div className="clay-card p-6 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-lavender-600" />
          <h3 className="font-bold text-slateindigo-700 dark:text-slateindigo-100">Quick Add Critical Note</h3>
          <span className="text-xs text-mint-500 font-medium">Auto-saves on add</span>
        </div>
        <div className="space-y-3">
          <textarea
            value={newNote.content}
            onChange={(e) => setNewNote((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Enter high-yield note, trap, or key exam point..."
            className="clay-input min-h-[80px]"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newNote.tag}
              onChange={(e) => setNewNote((prev) => ({ ...prev, tag: e.target.value as NoteTag }))}
              className="clay-input flex-1"
            >
              {(Object.entries(TAG_CONFIG) as [NoteTag, typeof TAG_CONFIG.piege][]).map(([tag, cfg]) => (
                <option key={tag} value={tag}>{cfg.emoji} {cfg.label}</option>
              ))}
            </select>
            <select
              value={newNote.moduleId}
              onChange={(e) => setNewNote((prev) => ({ ...prev, moduleId: e.target.value }))}
              className="clay-input flex-1"
            >
              <option value="">No module</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select
              value={newNote.lessonId}
              onChange={(e) => setNewNote((prev) => ({ ...prev, lessonId: e.target.value }))}
              className="clay-input flex-1"
            >
              <option value="">No lesson</option>
              {lessons.filter((l) => !newNote.moduleId || l.module_id === newNote.moduleId).map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
            <button onClick={addNote} className="clay-button flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slateindigo-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="clay-input pl-10"
          />
        </div>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value as NoteTag | 'all')}
          className="clay-input sm:w-40"
        >
          <option value="all">All tags</option>
          {(Object.entries(TAG_CONFIG) as [NoteTag, typeof TAG_CONFIG.piege][]).map(([tag, cfg]) => (
            <option key={tag} value={tag}>{cfg.emoji} {cfg.label}</option>
          ))}
        </select>
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="clay-input sm:w-40"
        >
          <option value="all">All modules</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>

      {/* Notes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full clay-card p-12 text-center">
            <Lightbulb className="w-12 h-12 text-lavender-300 mx-auto mb-3" />
            <p className="text-slateindigo-400">No notes found. Add your first high-yield note above!</p>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const tagCfg = TAG_CONFIG[note.tag] || TAG_CONFIG.piege;
            const module = modules.find((m) => m.id === note.module_id);
            const lesson = lessons.find((l) => l.id === note.lesson_id);
            return (
              <div key={note.id} className="clay-card p-5 animate-slide-up group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className={`pill-badge ${
                      note.tag === 'piege' || note.tag === 'tombable' ? 'bg-coral-500/15 text-coral-600 dark:text-coral-400' :
                      note.tag === 'definition' ? 'bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300' :
                      'bg-mint-500/15 text-mint-600'
                    }`}>
                      {note.tag === 'tombable' && <Flame className="w-3 h-3" />}
                      {tagCfg.emoji} {tagCfg.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* زر التعديل */}
                      <button
                        onClick={() => setEditingNote(note)}
                        className="p-1.5 rounded-lg text-lavender-600 hover:bg-lavender-500/10"
                        title="Edit Note"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1.5 rounded-lg text-coral-500 hover:bg-coral-500/10"
                        title="Delete Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slateindigo-700 dark:text-slateindigo-100 mb-3 whitespace-pre-wrap">{note.content}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-lavender-100/50">
                  <div className="flex items-center gap-2 text-xs text-slateindigo-400">
                    {module && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {module.name}</span>}
                    {lesson && <span className="truncate max-w-[120px]">· {lesson.title}</span>}
                  </div>
                  <button
                    onClick={() => generateFlashcard(note)}
                    className="text-xs text-lavender-600 hover:text-lavender-700 font-medium flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" /> Make Flashcard
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* نافذة التعديل المنبثقة (Edit Modal) */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slateindigo-900/30 backdrop-blur-sm" onClick={() => setEditingNote(null)} />
          <div className="relative w-full max-w-lg clay-card p-6 animate-scale-in">
            <h2 className="text-xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50 mb-4">Edit Critical Note</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Content</label>
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  className="clay-input min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={editingNote.tag}
                  onChange={(e) => setEditingNote({ ...editingNote, tag: e.target.value as NoteTag })}
                  className="clay-input"
                >
                  {(Object.entries(TAG_CONFIG) as [NoteTag, typeof TAG_CONFIG.piege][]).map(([tag, cfg]) => (
                    <option key={tag} value={tag}>{cfg.emoji} {cfg.label}</option>
                  ))}
                </select>
                <select
                  value={editingNote.module_id || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, module_id: e.target.value, lesson_id: null })}
                  className="clay-input"
                >
                  <option value="">No module</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <select
                  value={editingNote.lesson_id || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, lesson_id: e.target.value })}
                  className="clay-input"
                >
                  <option value="">No lesson</option>
                  {lessons.filter((l) => !editingNote.module_id || l.module_id === editingNote.module_id).map((l) => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
              <button onClick={updateNote} className="clay-button w-full">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Flashcard quiz popup */}
      {flashcardQuiz && (
        <div className="fixed bottom-6 right-6 z-50 clay-card p-6 max-w-sm animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-lavender-600" />
            <h4 className="font-bold text-slateindigo-700 dark:text-slateindigo-100">Quick Recall</h4>
            <button onClick={() => setFlashcardQuiz(null)} className="ml-auto text-slateindigo-400 hover:text-slateindigo-700">×</button>
          </div>
          <p className="text-sm text-slateindigo-600 dark:text-slateindigo-200 mb-3">{flashcardQuiz.answer}</p>
          <p className="text-xs text-slateindigo-400 mb-3">Can you recall the full context of this note?</p>
          <div className="flex gap-2">
            <button
              onClick={() => { generateFlashcard(flashcardQuiz.note); setFlashcardQuiz(null); }}
              className="clay-button text-sm flex-1"
            >
              Save as Flashcard
            </button>
            <button onClick={() => setFlashcardQuiz(null)} className="clay-button-secondary text-sm">Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}