import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import type { Resume, ResumeFormat, Module, Lesson } from '@/lib/types';
import {
  FileText, Plus, Trash2, File, Image, Edit3, Search, Upload, BookOpen, Edit2,
} from 'lucide-react';

// تعريف نوع بيانات دقيق وموسع لتجنب أي تعارض مع TypeScript
type ResumeItem = Resume & {
  module_id?: string | null;
  lesson_id?: string | null;
};

export function ResumesVaultPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [search, setSearch] = useState('');
  
  // فلاتر البحث
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterLesson, setFilterLesson] = useState<string>('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResume, setEditingResume] = useState<ResumeItem | null>(null);
  
  // حالة إضافة ملخص جديد
  const [newResume, setNewResume] = useState<{
    format: ResumeFormat;
    title: string;
    content: string;
    moduleId: string;
    lessonId: string;
    fileUrl: string;
  }>({
    format: 'text',
    title: '',
    content: '',
    moduleId: '',
    lessonId: '',
    fileUrl: '',
  });
  
  const [loading, setLoading] = useState(true);

  // جلب الملخصات
  const fetchResumes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      let query = supabase.from('resumes').select('*').order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching resumes:', error);
        return;
      }
      if (data) setResumes(data as ResumeItem[]);
    } catch (err) {
      console.error('Exception fetching resumes:', err);
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
    Promise.all([fetchResumes(), fetchModules(), fetchLessons()]).finally(() => setLoading(false));
  }, [fetchResumes, fetchModules, fetchLessons]);

  const addResume = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      if (!newResume.title.trim()) {
        showToast('Please enter a title', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('resumes')
        .insert({
          user_id: userId,
          format: newResume.format,
          title: newResume.title,
          content: newResume.format === 'text' ? newResume.content : null,
          file_url: newResume.format !== 'text' ? newResume.fileUrl : null,
          module_id: newResume.moduleId || null,
          lesson_id: newResume.lessonId || null,
        })
        .select()
        .single();

      if (error) { showToast(error.message, 'error'); return; }
      setResumes((prev) => [data as ResumeItem, ...prev]);
      setNewResume({ format: 'text', title: '', content: '', moduleId: '', lessonId: '', fileUrl: '' });
      setShowAddModal(false);
      showToast('Resume added successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error adding resume', 'error');
    }
  };

  // دالة تحديث الملخص الموجود
  const saveUpdatedResume = async () => {
    if (!editingResume) return;
    try {
      const { error } = await supabase
        .from('resumes')
        .update({
          title: editingResume.title,
          content: editingResume.content,
          module_id: editingResume.module_id || null,
          lesson_id: editingResume.lesson_id || null,
        })
        .eq('id', editingResume.id);

      if (error) {
        showToast(error.message, 'error');
        return;
      }

      setResumes((prev) =>
        prev.map((r) => (r.id === editingResume.id ? editingResume : r))
      );
      setEditingResume(null);
      showToast('Resume updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating resume', 'error');
    }
  };

  const deleteResume = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setResumes((prev) => prev.filter((r) => r.id !== id));
    setEditingResume(null);
    showToast('Resume deleted', 'info');
  };

  const handleFileUpload = async (file: File) => {
    const url = URL.createObjectURL(file);
    setNewResume((prev) => ({ ...prev, fileUrl: url, title: prev.title || file.name }));
    showToast('File ready to attach', 'success');
  };

  // تصفية الملخصات
  const filteredResumes = resumes.filter((r) => {
    if (filterModule !== 'all' && r.module_id !== filterModule) return false;
    if (filterLesson !== 'all' && r.lesson_id !== filterLesson) return false;
    if (search && !r.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const FORMAT_CONFIG: Record<ResumeFormat, { label: string; icon: typeof File; color: string }> = {
    pdf: { label: 'PDF', icon: File, color: 'coral' },
    image: { label: 'Image', icon: Image, color: 'lavender' },
    text: { label: 'Text', icon: Edit3, color: 'mint' },
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><FileText className="w-8 h-8 text-lavender-500 animate-pulse-soft" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slateindigo-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resumes..."
            className="clay-input pl-10 w-full"
          />
        </div>
        <button onClick={() => setShowAddModal(true)} className="clay-button flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Resume
        </button>
      </div>

      {/* Filters Bar */}
      <div className="clay-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200">
          <BookOpen className="w-4 h-4 text-lavender-600" /> Filters:
        </div>
        <select
          value={filterModule}
          onChange={(e) => {
            setFilterModule(e.target.value);
            setFilterLesson('all');
          }}
          className="clay-input flex-1"
        >
          <option value="all">All Modules</option>
          {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={filterLesson}
          onChange={(e) => setFilterLesson(e.target.value)}
          className="clay-input flex-1"
        >
          <option value="all">All Lessons</option>
          {lessons
            .filter((l) => filterModule === 'all' || l.module_id === filterModule)
            .map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </div>

      {/* Resumes grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResumes.length === 0 ? (
          <div className="col-span-full clay-card p-12 text-center">
            <FileText className="w-12 h-12 text-lavender-300 mx-auto mb-3" />
            <p className="text-slateindigo-400">No resumes yet. Add PDFs, images, or text notes per lesson.</p>
          </div>
        ) : (
          filteredResumes.map((resume) => {
            const cfg = FORMAT_CONFIG[resume.format];
            const Icon = cfg.icon;
            const lesson = lessons.find((l) => l.id === resume.lesson_id);
            const module = modules.find((m) => m.id === resume.module_id);
            return (
              <div
                key={resume.id}
                className="clay-card p-5 text-left transition-all group animate-slide-up flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      resume.format === 'pdf' ? 'bg-coral-500/15' :
                      resume.format === 'image' ? 'bg-lavender-100' : 'bg-mint-500/15'
                    }`}>
                      <Icon className={`w-6 h-6 ${
                        resume.format === 'pdf' ? 'text-coral-500' :
                        resume.format === 'image' ? 'text-lavender-600' : 'text-mint-500'
                      }`} />
                    </div>
                    <span className="pill-badge bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300">
                      {cfg.label}
                    </span>
                  </div>
                  <h3 className="font-bold text-slateindigo-800 dark:text-slateindigo-50 mb-1 truncate">
                    {resume.title || 'Untitled'}
                  </h3>
                  <div className="flex flex-wrap gap-1 text-xs text-slateindigo-400 mb-2">
                    {module && <span className="font-medium text-lavender-600 dark:text-lavender-400">{module.name}</span>}
                    {module && lesson && <span>·</span>}
                    {lesson && <span className="truncate">{lesson.title}</span>}
                  </div>
                  {resume.format === 'text' && resume.content && (
                    <p className="text-sm text-slateindigo-500 dark:text-slateindigo-200 line-clamp-3 mb-4">
                      {resume.content}
                    </p>
                  )}
                  {resume.format === 'image' && resume.file_url && (
                    <div className="mt-2 mb-4 rounded-xl overflow-hidden bg-lavender-50 dark:bg-slateindigo-800 h-24 flex items-center justify-center">
                      <img src={resume.file_url} alt={resume.title || ''} className="max-h-full max-w-full object-contain" />
                    </div>
                  )}
                  {resume.format === 'pdf' && (
                    <p className="text-sm text-slateindigo-400 mb-4 flex items-center gap-1">
                      <File className="w-4 h-4" /> PDF document
                    </p>
                  )}
                </div>

                {/* أزرار التعديل والحذف لكل كارت */}
                <div className="flex items-center gap-2 pt-3 border-t border-lavender-100 dark:border-slateindigo-700/50">
                  <button
                    onClick={() => setEditingResume(resume)}
                    className="clay-button-secondary flex-1 py-1.5 px-3 text-xs flex items-center justify-center gap-1 text-lavender-600 dark:text-lavender-300"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => deleteResume(resume.id)}
                    className="clay-button-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1 text-coral-500 hover:bg-coral-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Resume" size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(FORMAT_CONFIG) as [ResumeFormat, typeof FORMAT_CONFIG.pdf][]).map(([fmt, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={fmt}
                    onClick={() => setNewResume((prev) => ({ ...prev, format: fmt }))}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                      newResume.format === fmt ? 'border-lavender-500 bg-lavender-50 dark:bg-lavender-700/20' : 'border-lavender-100 dark:border-slateindigo-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 text-slateindigo-500" />
                    <span className="text-xs font-medium">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Title</label>
            <input
              type="text"
              value={newResume.title}
              onChange={(e) => setNewResume((prev) => ({ ...prev, title: e.target.value }))}
              className="clay-input"
              placeholder="e.g., Cardiologie - Insuffisance cardiaque"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Module</label>
              <select
                value={newResume.moduleId}
                onChange={(e) => setNewResume((prev) => ({ ...prev, moduleId: e.target.value, lessonId: '' }))}
                className="clay-input"
              >
                <option value="">No module</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Lesson</label>
              <select
                value={newResume.lessonId}
                onChange={(e) => setNewResume((prev) => ({ ...prev, lessonId: e.target.value }))}
                className="clay-input"
              >
                <option value="">No lesson</option>
                {lessons
                  .filter((l) => !newResume.moduleId || l.module_id === newResume.moduleId)
                  .map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          </div>

          {newResume.format === 'text' && (
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Content (Markdown supported)</label>
              <textarea
                value={newResume.content}
                onChange={(e) => setNewResume((prev) => ({ ...prev, content: e.target.value }))}
                className="clay-input min-h-[200px] font-mono text-sm"
                placeholder="Write your summary or notes here..."
              />
            </div>
          )}
          {(newResume.format === 'pdf' || newResume.format === 'image') && (
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Upload File</label>
              <div
                className="border-2 border-dashed border-lavender-200 dark:border-lavender-700/40 rounded-2xl p-6 text-center cursor-pointer hover:border-lavender-400 transition-all"
                onClick={() => document.getElementById('resume-file-input')?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept={newResume.format === 'pdf' ? '.pdf' : 'image/*'}
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
                <Upload className="w-8 h-8 text-lavender-400 mx-auto mb-2" />
                <p className="text-sm text-slateindigo-500">
                  {newResume.fileUrl ? 'File ready ✓' : 'Click or drag to upload'}
                </p>
              </div>
            </div>
          )}
          <button onClick={addResume} className="clay-button w-full">Add Resume</button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editingResume} onClose={() => setEditingResume(null)} title="Edit Resume" size="lg">
        {editingResume && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Title</label>
              <input
                type="text"
                value={editingResume.title || ''}
                onChange={(e) => setEditingResume({ ...editingResume, title: e.target.value })}
                className="clay-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Module</label>
                <select
                  value={editingResume.module_id || ''}
                  onChange={(e) => setEditingResume({ ...editingResume, module_id: e.target.value, lesson_id: '' })}
                  className="clay-input"
                >
                  <option value="">No module</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Lesson</label>
                <select
                  value={editingResume.lesson_id || ''}
                  onChange={(e) => setEditingResume({ ...editingResume, lesson_id: e.target.value })}
                  className="clay-input"
                >
                  <option value="">No lesson</option>
                  {lessons
                    .filter((l) => !editingResume.module_id || l.module_id === editingResume.module_id)
                    .map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
            </div>

            {editingResume.format === 'text' && (
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Content</label>
                <textarea
                  value={editingResume.content || ''}
                  onChange={(e) => setEditingResume({ ...editingResume, content: e.target.value })}
                  className="clay-input min-h-[250px] font-mono text-sm"
                />
              </div>
            )}

            {editingResume.format === 'image' && editingResume.file_url && (
              <div className="rounded-2xl overflow-hidden bg-lavender-50 dark:bg-slateindigo-800 p-4 flex items-center justify-center min-h-[200px]">
                <img src={editingResume.file_url} alt={editingResume.title || ''} className="max-w-full max-h-[300px] object-contain" />
              </div>
            )}

            {editingResume.format === 'pdf' && editingResume.file_url && (
              <div className="clay-card-sm p-6 text-center">
                <File className="w-10 h-10 text-coral-500 mx-auto mb-2" />
                <a
                  href={editingResume.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lavender-600 hover:text-lavender-700 font-medium text-sm"
                >
                  Open PDF in new tab
                </a>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={saveUpdatedResume} className="clay-button flex-1">
                Save Changes
              </button>
              <button
                onClick={() => deleteResume(editingResume.id)}
                className="clay-button-secondary text-coral-500 px-4 flex items-center justify-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}