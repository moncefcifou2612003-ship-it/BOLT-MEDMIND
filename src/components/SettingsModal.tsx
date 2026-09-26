import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';
import { User, Calendar, Save } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setExamDate(profile.exam_date || '');
    }
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      exam_date: examDate || null,
    }).eq('id', profile.id);
    if (error) {
      showToast('Failed to save settings', 'error');
    } else {
      showToast('Settings saved', 'success');
      await refreshProfile();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 flex items-center gap-1.5">
            <User className="w-4 h-4" /> Full Name
          </label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="clay-input" />
        </div>

        <div>
          <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> Exam Date
          </label>
          <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="clay-input" />
        </div>

        <button onClick={save} disabled={saving} className="clay-button w-full flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Modal>
  );
}