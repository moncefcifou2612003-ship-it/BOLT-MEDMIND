import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import type { Sujet } from '@/lib/types';
import {
  ClipboardList, Plus, Trash2, Edit2, TrendingUp, Award, AlertTriangle, Calendar, Search,
} from 'lucide-react';

export function SujetsManagerPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [sujets, setSujets] = useState<Sujet[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSujet, setEditingSujet] = useState<Sujet | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // خانة البحث
  
  const [newSujet, setNewSujet] = useState({
    year: new Date().getFullYear(),
    subject_name: '',
    score: 0,
    max_score: 20,
    weak_areas: '',
    notes: '',
  });
  
  const [loading, setLoading] = useState(true);

  // جلب السجيات مع دعم الحساب التجريبي والمستخدمين الحقيقيين
  const fetchSujets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      let query = supabase.from('sujets').select('*').order('year', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching sujets:', error);
        return;
      }
      if (data) setSujets(data as Sujet[]);
    } catch (err) {
      console.error('Exception fetching sujets:', err);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchSujets().finally(() => setLoading(false));
  }, [fetchSujets]);

  const addSujet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      if (!newSujet.subject_name.trim()) {
        showToast('Please enter a subject name', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('sujets')
        .insert({
          user_id: userId,
          year: newSujet.year,
          subject_name: newSujet.subject_name,
          score: newSujet.score,
          max_score: newSujet.max_score,
          weak_areas: newSujet.weak_areas || null,
          notes: newSujet.notes || null,
        })
        .select()
        .single();

      if (error) { showToast(error.message, 'error'); return; }
      setSujets((prev) => [data as Sujet, ...prev]);
      setNewSujet({ year: new Date().getFullYear(), subject_name: '', score: 0, max_score: 20, weak_areas: '', notes: '' });
      setShowAddModal(false);
      showToast('Sujet logged', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error adding sujet', 'error');
    }
  };

  // دالة حفظ التعديلات على السُّجي الموجود
  const saveUpdatedSujet = async () => {
    if (!editingSujet) return;
    try {
      const { error } = await supabase
        .from('sujets')
        .update({
          year: editingSujet.year,
          subject_name: editingSujet.subject_name,
          score: editingSujet.score,
          max_score: editingSujet.max_score,
          weak_areas: editingSujet.weak_areas || null,
          notes: editingSujet.notes || null,
        })
        .eq('id', editingSujet.id);

      if (error) {
        showToast(error.message, 'error');
        return;
      }

      setSujets((prev) => prev.map((s) => (s.id === editingSujet.id ? editingSujet : s)));
      setEditingSujet(null);
      showToast('Updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating sujet', 'error');
    }
  };

  const deleteSujet = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sujet?')) return;
    const { error } = await supabase.from('sujets').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setSujets((prev) => prev.filter((s) => s.id !== id));
    setEditingSujet(null);
    showToast('Sujet deleted', 'info');
  };

  // تصفية السجيات بناءً على خانة البحث (اسم المادة)
  const filteredSujets = useMemo(() => {
    if (!searchQuery.trim()) return sujets;
    return sujets.filter((s) =>
      s.subject_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [sujets, searchQuery]);

  const avgScore = sujets.length > 0
    ? sujets.reduce((sum, s) => sum + (s.score / s.max_score) * 20, 0) / sujets.length
    : 0;

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><ClipboardList className="w-8 h-8 text-lavender-500 animate-pulse-soft" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="clay-card p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-lavender-600" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">{sujets.length}</p>
            <p className="text-xs text-slateindigo-400">Sujets logged</p>
          </div>
        </div>
        <div className="clay-card p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-mint-500/15 flex items-center justify-center">
            <Award className="w-6 h-6 text-mint-500" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">{avgScore.toFixed(1)}/20</p>
            <p className="text-xs text-slateindigo-400">Average score</p>
          </div>
        </div>
        <div className="clay-card p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-coral-500/15 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-coral-500" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
              {sujets.length > 0 ? Math.max(...sujets.map((s) => (s.score / s.max_score) * 20)).toFixed(1) : '0.0'}/20
            </p>
            <p className="text-xs text-slateindigo-400">Best score</p>
          </div>
        </div>
      </div>

      {/* Action Bar (Search & Add Button) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* خانة البحث */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slateindigo-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by subject name..."
            className="clay-input pl-10 pr-4 py-2 w-full text-sm"
          />
        </div>

        <button onClick={() => setShowAddModal(true)} className="clay-button flex items-center gap-1 w-full sm:w-auto justify-center">
          <Plus className="w-4 h-4" /> Log Sujet
        </button>
      </div>

      {/* Sujets list */}
      <div className="space-y-3">
        {filteredSujets.length === 0 ? (
          <div className="clay-card p-12 text-center">
            <ClipboardList className="w-12 h-12 text-lavender-300 mx-auto mb-3" />
            <p className="text-slateindigo-400">
              {sujets.length === 0 ? 'No sujets logged yet. Track past residency exam papers here.' : 'No matching sujets found.'}
            </p>
          </div>
        ) : (
          filteredSujets.map((sujet) => {
            const pct = (sujet.score / sujet.max_score) * 100;
            const scoreColor = pct >= 75 ? 'text-mint-500' : pct >= 50 ? 'text-lavender-600' : 'text-coral-500';
            return (
              <div key={sujet.id} className="clay-card p-5 animate-slide-up flex flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="pill-badge bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300">
                        <Calendar className="w-3 h-3" /> {sujet.year}
                      </span>
                      <h3 className="font-bold text-slateindigo-800 dark:text-slateindigo-50">{sujet.subject_name}</h3>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`text-2xl font-bold font-display ${scoreColor}`}>
                        {sujet.score}/{sujet.max_score}
                      </span>
                      <div className="flex-1 max-w-[200px] h-2 rounded-full bg-lavender-100 dark:bg-slateindigo-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 75 ? 'bg-mint-500' : pct >= 50 ? 'bg-lavender-500' : 'bg-coral-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    {sujet.weak_areas && (
                      <div className="flex items-start gap-2 text-sm text-slateindigo-500 dark:text-slateindigo-200 mb-1">
                        <AlertTriangle className="w-4 h-4 text-coral-500 flex-shrink-0 mt-0.5" />
                        <span><strong>Weak areas:</strong> {sujet.weak_areas}</span>
                      </div>
                    )}
                    {sujet.notes && (
                      <p className="text-sm text-slateindigo-500 dark:text-slateindigo-200 mt-1">{sujet.notes}</p>
                    )}
                  </div>

                  {/* أزرار التعديل والحذف لكل سُجي */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditingSujet(sujet)}
                      className="clay-button-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1 text-lavender-600 dark:text-lavender-300"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => deleteSujet(sujet.id)}
                      className="clay-button-secondary py-1.5 px-3 text-xs flex items-center justify-center gap-1 text-coral-500 hover:bg-coral-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Log Past Exam Sujet">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Year</label>
              <input
                type="number"
                value={newSujet.year}
                onChange={(e) => setNewSujet((prev) => ({ ...prev, year: Number(e.target.value) }))}
                className="clay-input"
                min={2000}
                max={2030}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Subject</label>
              <input
                type="text"
                value={newSujet.subject_name}
                onChange={(e) => setNewSujet((prev) => ({ ...prev, subject_name: e.target.value }))}
                className="clay-input"
                placeholder="e.g., Cardiologie"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Score</label>
              <input
                type="number"
                value={newSujet.score}
                onChange={(e) => setNewSujet((prev) => ({ ...prev, score: Number(e.target.value) }))}
                className="clay-input"
                step={0.5}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Max Score</label>
              <input
                type="number"
                value={newSujet.max_score}
                onChange={(e) => setNewSujet((prev) => ({ ...prev, max_score: Number(e.target.value) }))}
                className="clay-input"
                step={0.5}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Weak Areas</label>
            <input
              type="text"
              value={newSujet.weak_areas}
              onChange={(e) => setNewSujet((prev) => ({ ...prev, weak_areas: e.target.value }))}
              className="clay-input"
              placeholder="e.g., Rythms, Pharmacology"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Notes</label>
            <textarea
              value={newSujet.notes}
              onChange={(e) => setNewSujet((prev) => ({ ...prev, notes: e.target.value }))}
              className="clay-input min-h-[80px]"
              placeholder="Additional notes..."
            />
          </div>
          <button onClick={addSujet} className="clay-button w-full">Log Sujet</button>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editingSujet} onClose={() => setEditingSujet(null)} title="Edit Past Exam Sujet">
        {editingSujet && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Year</label>
                <input
                  type="number"
                  value={editingSujet.year}
                  onChange={(e) => setEditingSujet({ ...editingSujet, year: Number(e.target.value) })}
                  className="clay-input"
                  min={2000}
                  max={2030}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Subject</label>
                <input
                  type="text"
                  value={editingSujet.subject_name}
                  onChange={(e) => setEditingSujet({ ...editingSujet, subject_name: e.target.value })}
                  className="clay-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Score</label>
                <input
                  type="number"
                  value={editingSujet.score}
                  onChange={(e) => setEditingSujet({ ...editingSujet, score: Number(e.target.value) })}
                  className="clay-input"
                  step={0.5}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Max Score</label>
                <input
                  type="number"
                  value={editingSujet.max_score}
                  onChange={(e) => setEditingSujet({ ...editingSujet, max_score: Number(e.target.value) })}
                  className="clay-input"
                  step={0.5}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Weak Areas</label>
              <input
                type="text"
                value={editingSujet.weak_areas || ''}
                onChange={(e) => setEditingSujet({ ...editingSujet, weak_areas: e.target.value })}
                className="clay-input"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">Notes</label>
              <textarea
                value={editingSujet.notes || ''}
                onChange={(e) => setEditingSujet({ ...editingSujet, notes: e.target.value })}
                className="clay-input min-h-[80px]"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveUpdatedSujet} className="clay-button flex-1">
                Save Changes
              </button>
              <button
                onClick={() => deleteSujet(editingSujet.id)}
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