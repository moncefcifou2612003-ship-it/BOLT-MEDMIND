import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import type { CalendarEvent, CalendarEventType, InternatScheduleEntry } from '@/lib/types';
import { 
  Stethoscope, 
  Trash2, 
  Edit3, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen,
  Clock,
  FileText,
  Plus,
  GraduationCap,
  Upload,
  X,
  Image as ImageIcon,
  Moon
} from 'lucide-react';

const EVENT_CONFIG: Record<CalendarEventType, { label: string; color: string; icon: typeof BookOpen }> = {
  rotation: { label: 'Rotation', color: 'lavender', icon: Stethoscope },
  garde: { label: 'Garde', color: 'coral', icon: Moon },
  revision: { label: 'Révision', color: 'mint', icon: BookOpen },
  exam: { label: 'Examen', color: 'lavender', icon: GraduationCap },
};

interface Periode {
  id: number;
  name: string;
  service: string;
  startDate: string;
  endDate: string;
}

interface StageNote {
  id: string;
  periodeId: number;
  title: string;
  content: string;
  imageUrl?: string;
  date: string;
}

const DEFAULT_PERIODES: Periode[] = [
  { id: 1, name: 'P1', service: 'Médecine Interne', startDate: '2026-09-01', endDate: '2026-11-01' },
  { id: 2, name: 'P2', service: 'Chirurgie Générale', startDate: '2026-11-02', endDate: '2027-01-01' },
  { id: 3, name: 'P3', service: 'Pédiatrie', startDate: '2027-01-02', endDate: '2027-03-01' },
  { id: 4, name: 'P4', service: 'Gynécologie - Obstétrique', startDate: '2027-03-02', endDate: '2027-05-01' },
];

export function InternatPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [periodes, setPeriodes] = useState<Periode[]>(DEFAULT_PERIODES);
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number | null>(1);
  
  const [editingPeriodeId, setEditingPeriodeId] = useState<number | null>(null);
  const [tempService, setTempService] = useState('');
  const [tempStart, setTempStart] = useState('');
  const [tempEnd, setTempEnd] = useState('');

  const [notes, setNotes] = useState<StageNote[]>([]);

  const fetchPeriodes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      let query = supabase.from('internat_periodes').select('*').order('id', { ascending: true });
      if (userId) {
        query = query.eq('user_id', userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching periodes:', error);
        return;
      }

      if (data && data.length > 0) {
        const mapped: Periode[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          service: p.service,
          startDate: p.start_date,
          endDate: p.end_date,
        }));
        setPeriodes(mapped);
      } else {
        const initialPayload = DEFAULT_PERIODES.map(p => ({
          id: p.id,
          user_id: userId,
          name: p.name,
          service: p.service,
          start_date: p.startDate,
          end_date: p.endDate
        }));
        await supabase.from('internat_periodes').upsert(initialPayload);
        setPeriodes(DEFAULT_PERIODES);
      }
    } catch (err) {
      console.error('Exception fetching periodes:', err);
    }
  }, [profile?.id]);

  const fetchNotes = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = profile?.id || user?.id || null;

      let query = supabase.from('internat_notes').select('*').order('created_at', { ascending: false });
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

      if (data) {
        const mappedNotes: StageNote[] = data.map((n: any) => ({
          id: n.id,
          periodeId: n.periode_id,
          title: n.title,
          content: n.content,
          imageUrl: n.image_url,
          date: n.date,
        }));
        setNotes(mappedNotes);
      }
    } catch (err) {
      console.error('Exception fetching notes:', err);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchPeriodes();
    fetchNotes();
  }, [fetchPeriodes, fetchNotes]);

  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string>('');
  
  const [activeNoteModal, setActiveNoteModal] = useState<StageNote | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [internatEntries, setInternatEntries] = useState<InternatScheduleEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState<{ date: string; type: CalendarEventType; title: string }>({
    date: new Date().toISOString().split('T')[0],
    type: 'revision',
    title: '',
  });

  const fetchEvents = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date');
    if (data) setEvents(data as CalendarEvent[]);
  }, [currentDate]);

  const fetchInternatEntries = useCallback(async () => {
    const { data } = await supabase
      .from('internat_schedule')
      .select('*')
      .order('start_date');
    if (data) setInternatEntries(data as InternatScheduleEntry[]);
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchInternatEntries();
  }, [fetchEvents, fetchInternatEntries]);

  const handleDayClick = (dateStr: string) => {
    setNewEvent({
      date: dateStr,
      type: 'revision',
      title: '',
    });
    setShowAddModal(true);
  };

  const addEvent = async () => {
    if (!newEvent.title.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = profile?.id || user?.id || null;

    const { error } = await supabase.from('calendar_events').insert({
      user_id: userId,
      date: newEvent.date,
      type: newEvent.type,
      title: newEvent.title,
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Événement ajouté avec succès', 'success');
    setNewEvent({ date: new Date().toISOString().split('T')[0], type: 'revision', title: '' });
    setShowAddModal(false);
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    showToast('Événement supprimé', 'info');
    await fetchEvents();
  };

  const getEventsForDate = (dateStr: string) => events.filter((e) => e.date === dateStr);
  const getInternatForDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return internatEntries.filter((i) => {
      const start = new Date(i.start_date);
      const end = new Date(i.end_date);
      return d >= start && d <= end;
    });
  };

  const monthName = currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay();
  const todayStr = new Date().toISOString().split('T')[0];

  const days: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), d).toISOString().split('T')[0];
    days.push(dateStr);
  }

  const handleStartEdit = (p: Periode) => {
    setEditingPeriodeId(p.id);
    setTempService(p.service);
    setTempStart(p.startDate);
    setTempEnd(p.endDate);
  };

  const handleSaveEdit = async (id: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = profile?.id || user?.id || null;

    const { error } = await supabase
      .from('internat_periodes')
      .upsert({
        id: id,
        user_id: userId,
        name: periodes.find(p => p.id === id)?.name || `P${id}`,
        service: tempService,
        start_date: tempStart,
        end_date: tempEnd,
      });

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    setPeriodes(periodes.map(p => p.id === id ? { ...p, service: tempService, startDate: tempStart, endDate: tempEnd } : p));
    setEditingPeriodeId(null);
    showToast('Stage mis à jour et enregistré avec succès', 'success');
  };

  const selectedPeriode = periodes.find(p => p.id === selectedPeriodeId);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const currentActiveStage = periodes.find(p => todayDateStr >= p.startDate && todayDateStr <= p.endDate) || periodes[0];

  const calculateRemainingDays = (endDateStr: string) => {
    const today = new Date(todayDateStr);
    const end = new Date(endDateStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  const remainingDays = calculateRemainingDays(currentActiveStage.endDate);

  const formatDateWithoutYear = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddNote = () => {
    setEditingNoteId(null);
    setNewNoteTitle('');
    setNewNoteContent('');
    setUploadedImagePreview('');
    setShowAddNoteModal(true);
  };

  const handleOpenEditNote = (note: StageNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteId(note.id);
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    setUploadedImagePreview(note.imageUrl || '');
    setShowAddNoteModal(true);
  };

  const handleSaveNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = profile?.id || user?.id || null;

    if (!selectedPeriodeId || !newNoteTitle.trim()) {
      showToast('Veuillez remplir le titre', 'error');
      return;
    }

    const d = new Date();
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

    if (editingNoteId) {
      // تعديل نوت موجودة مسبقاً
      const { error } = await supabase.from('internat_notes').update({
        title: newNoteTitle,
        content: newNoteContent,
        image_url: uploadedImagePreview || null,
      }).eq('id', editingNoteId);

      if (error) {
        showToast(error.message, 'error');
        return;
      }

      setNotes(notes.map(n => n.id === editingNoteId ? {
        ...n,
        title: newNoteTitle,
        content: newNoteContent,
        imageUrl: uploadedImagePreview
      } : n));
      showToast('Note modifiée avec succès', 'success');
    } else {
      // إضافة نوت جديدة
      const generatedId = Date.now().toString();
      const { error } = await supabase.from('internat_notes').insert({
        id: generatedId,
        user_id: userId,
        periode_id: selectedPeriodeId,
        title: newNoteTitle,
        content: newNoteContent,
        image_url: uploadedImagePreview || null,
        date: formattedDate,
      });

      if (error) {
        showToast(error.message, 'error');
        return;
      }

      const newNote: StageNote = {
        id: generatedId,
        periodeId: selectedPeriodeId,
        title: newNoteTitle,
        content: newNoteContent,
        imageUrl: uploadedImagePreview,
        date: formattedDate
      };

      setNotes([newNote, ...notes]);
      showToast('Note de stage ajoutée avec succès', 'success');
    }

    setNewNoteTitle('');
    setNewNoteContent('');
    setUploadedImagePreview('');
    setEditingNoteId(null);
    setShowAddNoteModal(false);
  };

  const deleteNote = async (noteId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();

    const { error } = await supabase
      .from('internat_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      showToast(error.message, 'error');
      return;
    }

    setNotes(notes.filter(n => n.id !== noteId));
    if (activeNoteModal?.id === noteId) {
      setActiveNoteModal(null);
    }
    showToast('Note supprimée', 'info');
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-10 overflow-hidden">
      
      {/* P1, P2, P3, P4 Horizontal Bar & Details directly below */}
      <div className="space-y-3">
        <div className="bg-white dark:bg-[#1E293B]/80 p-2.5 rounded-2xl shadow-clay border border-lavender-100/50 dark:border-slate-700/60 flex items-center gap-3 w-full">
          {periodes.map((p) => {
            const isSelected = p.id === selectedPeriodeId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPeriodeId(isSelected ? null : p.id)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-lavender-600 text-white shadow-clay-sm scale-[1.02]'
                    : 'bg-lavender-50/70 dark:bg-slate-800 text-slateindigo-600 dark:text-slate-300 hover:bg-lavender-100 dark:hover:bg-slate-700'
                }`}
              >
                <span className="tracking-wider">{p.name}</span>
              </button>
            );
          })}
        </div>

        {selectedPeriode && (
          <div className="bg-white dark:bg-[#1E293B]/80 p-5 rounded-3xl shadow-clay border border-lavender-200/60 dark:border-slate-700/60 space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
              <div className="space-y-1 flex-1 min-w-0 w-full">
                {editingPeriodeId === selectedPeriode.id ? (
                  <div className="space-y-2 w-full">
                    <input 
                      type="text" 
                      value={tempService} 
                      onChange={(e) => setTempService(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-lavender-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slateindigo-800 dark:text-white"
                      placeholder="Nom du module / service"
                    />
                    <div className="flex gap-2 w-full">
                      <input 
                        type="date" 
                        value={tempStart} 
                        onChange={(e) => setTempStart(e.target.value)}
                        className="w-1/2 text-[11px] p-2 rounded-xl border border-lavender-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slateindigo-800 dark:text-white"
                      />
                      <input 
                        type="date" 
                        value={tempEnd} 
                        onChange={(e) => setTempEnd(e.target.value)}
                        className="w-1/2 text-[11px] p-2 rounded-xl border border-lavender-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slateindigo-800 dark:text-white"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full truncate">
                    <h2 className="text-sm font-bold text-slateindigo-900 dark:text-white truncate">{selectedPeriode.name} : {selectedPeriode.service}</h2>
                    <p className="text-[11px] text-slateindigo-400 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{formatDateWithoutYear(selectedPeriode.startDate)}</span> 
                      <span className="font-bold text-lavender-600">→</span> 
                      <span>{formatDateWithoutYear(selectedPeriode.endDate)}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {editingPeriodeId === selectedPeriode.id ? (
                  <button 
                    onClick={() => handleSaveEdit(selectedPeriode.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Check className="w-3 h-3" /> Enregistrer
                  </button>
                ) : (
                  <button 
                    onClick={() => handleStartEdit(selectedPeriode)}
                    className="bg-lavender-50 dark:bg-slate-800 hover:bg-lavender-100 dark:hover:bg-slate-700 text-slateindigo-600 dark:text-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium border border-lavender-200 dark:border-slate-700 flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Edit3 className="w-3 h-3" /> Modifier
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-lavender-100 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slateindigo-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-lavender-600" /> Notes de Stage ({selectedPeriode.name} - {selectedPeriode.service})
                </h3>
                <button 
                  onClick={handleOpenAddNote}
                  className="bg-lavender-600 hover:bg-lavender-700 text-white px-2.5 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1 shadow-sm transition-all"
                >
                  <Plus className="w-3 h-3" /> Ajouter une note
                </button>
              </div>

              <div className="flex flex-wrap gap-2.5 py-1">
                {notes.filter(n => n.periodeId === selectedPeriode.id).map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setActiveNoteModal(note)}
                    className="group relative bg-lavender-50/80 dark:bg-slate-800 hover:bg-lavender-100 dark:hover:bg-slate-700 border border-lavender-200/60 dark:border-slate-700 rounded-2xl py-2.5 px-4 cursor-pointer transition-all flex items-center gap-2.5 shadow-sm hover:scale-[1.02]"
                  >
                    <div className="w-7 h-7 rounded-xl bg-lavender-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slateindigo-800 dark:text-white truncate max-w-[140px]">{note.title}</span>
                    <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleOpenEditNote(note, e)}
                        className="p-1 hover:text-lavender-600 text-slate-400"
                        title="Modifier"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => deleteNote(note.id, e)}
                        className="p-1 hover:text-coral-500 text-slate-400"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {notes.filter(n => n.periodeId === selectedPeriode.id).length === 0 && (
                  <p className="text-[11px] text-slate-400 w-full text-center py-4">Aucune note enregistrée pour ce stage.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={Boolean(activeNoteModal)} onClose={() => setActiveNoteModal(null)} title={activeNoteModal?.title || 'Détails de la note'}>
        {activeNoteModal && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-[11px] text-lavender-600 dark:text-lavender-400 font-semibold bg-lavender-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-lavender-100 dark:border-slate-700">
              <span>Date: {activeNoteModal.date}</span>
              <span>Stage: {selectedPeriode?.name}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="bg-lavender-50/40 dark:bg-slate-800/50 p-4 rounded-2xl border border-lavender-100 dark:border-slate-700 max-h-[300px] overflow-y-auto">
                <h4 className="text-xs font-bold text-slateindigo-700 dark:text-lavender-300 mb-2 uppercase tracking-wide">Contenu</h4>
                <p className="text-xs text-slateindigo-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{activeNoteModal.content}</p>
              </div>

              {activeNoteModal.imageUrl ? (
                <div className="rounded-2xl overflow-hidden border border-lavender-200 dark:border-slate-700 bg-black/5 flex items-center justify-center max-h-[300px]">
                  <img src={activeNoteModal.imageUrl} alt="Note attachment" className="w-full h-full object-contain max-h-[300px]" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-lavender-200 dark:border-slate-700 text-slate-400 text-xs">
                  <ImageIcon className="w-8 h-8 mb-2 opacity-40" />
                  <span>Aucune image jointe</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <div className="bg-white dark:bg-[#1E293B]/80 p-5 rounded-3xl shadow-clay border border-lavender-100/50 dark:border-slate-700/60 space-y-4">
        
        <div className="bg-lavender-50 dark:bg-slate-800/80 text-lavender-700 dark:text-lavender-300 px-4 py-2.5 rounded-2xl font-medium text-xs sm:text-sm border border-lavender-200/60 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope className="w-4 h-4 text-lavender-600 dark:text-lavender-400 shrink-0" />
            <span className="truncate">Stage Actif: <strong className="text-slateindigo-900 dark:text-white">{currentActiveStage.name} - {currentActiveStage.service}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-lavender-200/60 dark:border-slate-700 text-lavender-600 dark:text-lavender-300 shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingDays} jours restants</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              className="p-1.5 rounded-xl hover:bg-lavender-100 dark:hover:bg-slate-800 text-slateindigo-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold font-display text-slateindigo-800 dark:text-slate-100 capitalize">
              {monthName}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              className="p-1.5 rounded-xl hover:bg-lavender-100 dark:hover:bg-slate-800 text-slateindigo-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-slateindigo-400 dark:text-slate-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((dateStr, idx) => {
              if (!dateStr) return <div key={idx} />;
              const dayEvents = getEventsForDate(dateStr);
              const dayInternat = getInternatForDate(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(dateStr)}
                  className={`min-h-[72px] p-1.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] ${
                    isToday
                      ? 'border-lavender-500 bg-lavender-50/80 dark:bg-lavender-700/20 shadow-sm'
                      : 'border-lavender-100/60 dark:border-slate-700/60 hover:bg-lavender-50/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${isToday ? 'text-lavender-700 dark:text-lavender-300' : 'text-slateindigo-500 dark:text-slate-400'}`}>
                    {new Date(dateStr).getDate()}
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {dayInternat.map((i) => (
                      <div key={i.id} className="text-[9px] px-1 py-0.5 rounded bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300 truncate font-semibold">
                        {i.phase}
                      </div>
                    ))}
                    {dayEvents.map((e) => {
                      const cfg = EVENT_CONFIG[e.type] || EVENT_CONFIG.revision;
                      const Icon = cfg.icon;
                      return (
                        <div key={e.id} className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 truncate font-medium ${
                          e.type === 'garde' ? 'bg-coral-500/15 text-coral-600 dark:text-coral-400' :
                          e.type === 'revision' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                          'bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300'
                        }`}>
                          <Icon className="w-2 h-2 flex-shrink-0" />
                          <span className="truncate">{e.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-lavender-50/50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-wrap gap-4 items-center border border-lavender-100/60 dark:border-slate-700/50">
          {Object.entries(EVENT_CONFIG).map(([type, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={type} className="flex items-center gap-1.5 text-[11px] font-medium text-slateindigo-600 dark:text-slate-300">
                <Icon className="w-3.5 h-3.5 text-lavender-600 dark:text-lavender-400" />
                <span>{cfg.label}</span>
              </div>
            );
          })}
        </div>

        <div className="space-y-2.5 pt-1">
          <h3 className="text-xs font-bold text-slateindigo-700 dark:text-slate-100">Prochains Événements & Gardes</h3>
          <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {events.map((e) => {
              const cfg = EVENT_CONFIG[e.type] || EVENT_CONFIG.revision;
              const Icon = cfg.icon;
              return (
                <div key={e.id} className="bg-lavender-50/50 dark:bg-slate-800/50 p-3 rounded-2xl flex items-center gap-3 border border-lavender-100/50 dark:border-slate-700/50">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    e.type === 'garde' ? 'bg-coral-500/15 text-coral-600 dark:text-coral-400' :
                    e.type === 'revision' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                    'bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slateindigo-800 dark:text-white truncate">{e.title}</p>
                    <p className="text-[10px] text-slateindigo-400 dark:text-slate-400">
                      {new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={() => deleteEvent(e.id)} className="p-1.5 text-slateindigo-400 hover:text-coral-500 rounded-xl transition-all" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {events.length === 0 && (
              <p className="text-xs text-slateindigo-400 text-center py-4">Aucun événement à venir.</p>
            )}
          </div>
        </div>

      </div>

      {/* Add / Edit Note Modal */}
      <Modal open={showAddNoteModal} onClose={() => setShowAddNoteModal(false)} title={editingNoteId ? `Modifier la note (${selectedPeriode?.name})` : `Ajouter une note (${selectedPeriode?.name})`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slateindigo-600 dark:text-slate-200 mb-1.5 block">Titre de la note</label>
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="w-full text-sm p-3 rounded-2xl border border-lavender-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slateindigo-800 dark:text-white"
              placeholder="Ex: Conduite à tenir devant..."
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slateindigo-600 dark:text-slate-200 mb-1.5 block">Contenu</label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              className="w-full text-sm p-3 rounded-2xl border border-lavender-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slateindigo-800 dark:text-white resize-none"
              placeholder="Écrivez vos notes ici..."
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slateindigo-600 dark:text-slate-200 mb-1.5 block">Image / Pièce jointe</label>
            {uploadedImagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-lavender-200 dark:border-slate-700 bg-lavender-50/50 p-2 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <ImageIcon className="w-4 h-4 text-lavender-600 shrink-0" />
                  <span className="text-xs text-slateindigo-800 dark:text-white truncate">Image chargée avec succès</span>
                </div>
                <button 
                  onClick={() => setUploadedImagePreview('')} 
                  className="p-1 bg-white dark:bg-slate-800 rounded-xl text-slate-400 hover:text-coral-500 shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-lavender-200 dark:border-slate-700 hover:border-lavender-400 dark:hover:border-slate-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer bg-lavender-50/30 dark:bg-slate-800/30 transition-all">
                <Upload className="w-5 h-5 text-lavender-600 dark:text-lavender-400 mb-1" />
                <span className="text-xs font-medium text-slateindigo-600 dark:text-slate-300">Cliquez pour uploader une photo</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            )}
          </div>

          <button onClick={handleSaveNote} className="w-full bg-lavender-600 hover:bg-lavender-700 text-white p-3 rounded-2xl text-sm font-medium shadow-clay-sm transition-all">
            {editingNoteId ? 'Mettre à jour la note' : 'Enregistrer la note'}
          </button>
        </div>
      </Modal>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={`Ajouter pour le ${new Date(newEvent.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slateindigo-600 dark:text-slate-200 mb-1.5 block">Type d'Événement</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(EVENT_CONFIG) as [CalendarEventType, typeof EVENT_CONFIG.revision][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setNewEvent((prev) => ({ ...prev, type }))}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                      newEvent.type === type ? 'border-lavender-500 bg-lavender-50 dark:bg-lavender-700/25' : 'border-lavender-100 dark:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-lavender-600 dark:text-lavender-400" />
                    <span className="text-xs font-semibold text-slateindigo-700 dark:text-slate-100">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slateindigo-600 dark:text-slate-200 mb-1.5 block">Titre</label>
            <input
              type="text"
              value={newEvent.title}
              onChange={(e) => setNewEvent((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full text-sm p-3 rounded-2xl border border-lavender-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slateindigo-800 dark:text-white"
              placeholder="Ex: Garde Urgences / Rotation Service"
              onKeyDown={(e) => e.key === 'Enter' && addEvent()}
            />
          </div>
          <button onClick={addEvent} className="w-full bg-lavender-600 hover:bg-lavender-700 text-white p-3 rounded-2xl text-sm font-medium shadow-clay-sm transition-all">
            Ajouter l'Événement
          </button>
        </div>
      </Modal>

    </div>
  );
}