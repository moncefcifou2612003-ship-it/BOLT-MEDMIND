import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import type { InternatPhase, ModuleCategory, LessonPriority } from '@/lib/types';
import {
  User, CalendarClock, Upload, Layers, ChevronRight, ChevronLeft,
  Check, FlaskConical, Stethoscope, Flame, FileText, Sparkles, Plus, Trash2,
} from 'lucide-react';

interface ParsedLesson {
  moduleName: string;
  lessonTitle: string;
  category: ModuleCategory;
  isTombable: boolean;
  examPoints?: string;
}

export function OnboardingWizard() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [examDate, setExamDate] = useState('');
  const [internatPhases, setInternatPhases] = useState({
    P1: { start: '', end: '', hospital: '', gardes: false },
    P2: { start: '', end: '', hospital: '', gardes: false },
    P3: { start: '', end: '', hospital: '', gardes: false },
    P4: { start: '', end: '', hospital: '', gardes: false },
  });
  const [couche1, setCouche1] = useState(50);
  const [couche2, setCouche2] = useState(30);
  const [couche3, setCouche3] = useState(20);
  const [parsedLessons, setParsedLessons] = useState<ParsedLesson[]>([]);
  const [manualLessonInput, setManualLessonInput] = useState('');
  const [fileName, setFileName] = useState('');

  const totalSteps = 4;

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: ParsedLesson[] = [];
    let currentModule = '';
    let currentCategory: ModuleCategory = 'biologique';

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('biolog') || lower.includes('bio')) {
        currentCategory = 'biologique';
        continue;
      }
      if (lower.includes('clinique') || lower.includes('clinical')) {
        currentCategory = 'clinique';
        continue;
      }
      if (lower.startsWith('#') || lower.startsWith('module:') || lower.startsWith('module')) {
        currentModule = line.replace(/^#+\s*module:?\s*/i, '').replace(/^module:?\s*/i, '').trim();
        continue;
      }
      if (lower.includes('tombable') || lower.includes('🔥') || lower.includes('high-yield')) {
        const parts = line.split(/[-–—|]/);
        const lessonTitle = parts[0].replace(/🔥|tombable|high-yield/gi, '').trim();
        if (lessonTitle) {
          parsed.push({
            moduleName: currentModule || 'Uncategorized',
            lessonTitle,
            category: currentCategory,
            isTombable: true,
            examPoints: parts.slice(1).join(' ').trim() || undefined,
          });
        }
        continue;
      }
      if (line.length > 3) {
        parsed.push({
          moduleName: currentModule || 'Uncategorized',
          lessonTitle: line,
          category: currentCategory,
          isTombable: false,
        });
      }
    }
    setParsedLessons(parsed);
    showToast(`Parsed ${parsed.length} lessons from file`, 'success');
  }, [showToast]);

  const addManualLessons = () => {
    if (!manualLessonInput.trim()) return;
    const lines = manualLessonInput.split('\n').map((l) => l.trim()).filter(Boolean);
    const newLessons: ParsedLesson[] = lines.map((line) => {
      const isTomb = line.includes('🔥') || line.toLowerCase().includes('tombable');
      return {
        moduleName: 'Manual Import',
        lessonTitle: line.replace(/🔥|tombable/gi, '').trim(),
        category: 'biologique' as ModuleCategory,
        isTombable: isTomb,
      };
    });
    setParsedLessons((prev) => [...prev, ...newLessons]);
    setManualLessonInput('');
    showToast(`Added ${newLessons.length} lessons`, 'success');
  };

  const removeParsedLesson = (idx: number) => {
    setParsedLessons((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleTombable = (idx: number) => {
    setParsedLessons((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, isTombable: !l.isTombable } : l))
    );
  };

  const setCategory = (idx: number, cat: ModuleCategory) => {
    setParsedLessons((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, category: cat } : l))
    );
  };

  const finish = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // Update profile with exam date and couche allocation
      await supabase.from('profiles').update({
        exam_date: examDate || null,
        couche1_pct: couche1,
        couche2_pct: couche2,
        couche3_pct: couche3,
        onboarding_complete: true,
      }).eq('id', profile.id);

      // Save internat schedule
      const scheduleEntries = (Object.entries(internatPhases) as [InternatPhase, typeof internatPhases.P1][]).map(
        ([phase, data]) => ({
          user_id: profile.id,
          phase,
          start_date: data.start || null,
          end_date: data.end || null,
          hospital: data.hospital || null,
          has_gardes: data.gardes,
        })
      ).filter((e) => e.start_date && e.end_date);

      if (scheduleEntries.length > 0) {
        await supabase.from('internat_schedule').insert(scheduleEntries);
      }

      // Save parsed lessons to master DB (only if admin, or as suggestions)
      if (parsedLessons.length > 0) {
        // Group by module
        const moduleMap = new Map<string, { category: ModuleCategory; lessons: ParsedLesson[] }>();
        for (const lesson of parsedLessons) {
          const key = lesson.moduleName;
          if (!moduleMap.has(key)) {
            moduleMap.set(key, { category: lesson.category, lessons: [] });
          }
          moduleMap.get(key)!.lessons.push(lesson);
        }

        for (const [moduleName, { category, lessons }] of moduleMap) {
          // Check if module already exists
          const { data: existingModule } = await supabase
            .from('modules')
            .select('id')
            .eq('name', moduleName)
            .eq('category', category)
            .maybeSingle();

          let moduleId: string;
          if (existingModule) {
            moduleId = existingModule.id;
          } else {
            const { data: newModule, error: modError } = await supabase
              .from('modules')
              .insert({ name: moduleName, category, created_by: profile.id })
              .select('id')
              .single();
            if (modError || !newModule) continue;
            moduleId = newModule.id;
          }

          const lessonInserts = lessons.map((l) => ({
            module_id: moduleId,
            title: l.lessonTitle,
            is_tombable: l.isTombable,
            priority: (l.isTombable ? 'high' : 'normal') as LessonPriority,
            exam_points: l.examPoints || null,
          }));
          await supabase.from('lessons').insert(lessonInserts);
        }
      }

      showToast('Onboarding complete! Welcome to MEDMIND.', 'success');
      await refreshProfile();
    } catch (err) {
      showToast('Failed to save onboarding data. Please try again.', 'error');
      console.error(err);
    }
    setSaving(false);
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return couche1 + couche2 + couche3 === 100;
    return false;
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 bg-grid">
      <div className="w-full max-w-3xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s === step
                    ? 'bg-lavender-600 text-white shadow-clay scale-110'
                    : s < step
                    ? 'bg-mint-500 text-white'
                    : 'bg-lavender-100 text-slateindigo-400 dark:bg-slateindigo-800'
                }`}
              >
                {s < step ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-1 rounded-full transition-all ${s < step ? 'bg-mint-500' : 'bg-lavender-100 dark:bg-slateindigo-800'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="clay-card p-8 animate-scale-in">
          {/* Step 1: Identity confirmation */}
          {step === 1 && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-lavender-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
                    Welcome, {profile?.full_name}!
                  </h2>
                  <p className="text-sm text-slateindigo-400">Let's set up your study planner</p>
                </div>
              </div>
              <div className="clay-card-sm p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lavender-400 to-lavender-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profile?.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slateindigo-800 dark:text-slateindigo-50">{profile?.full_name}</p>
                    <p className="text-sm text-slateindigo-400">{profile?.email}</p>
                    <span className="pill-badge bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30 dark:text-lavender-300 mt-1">
                      {profile?.role === 'admin' ? 'Admin / Owner' : 'Student'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slateindigo-500 dark:text-slateindigo-200">
                  Your profile is ready. Click next to configure your exam date and hospital rotation schedule.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Exam date & Internat schedule */}
          {step === 2 && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center">
                  <CalendarClock className="w-6 h-6 text-lavender-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
                    Exam Date & Internat Schedule
                  </h2>
                  <p className="text-sm text-slateindigo-400">Set your residency exam and P1–P4 rotations</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">
                    Residency Exam Date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="clay-input"
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slateindigo-600 dark:text-slateindigo-200">
                    Hospital Internat Rotations (P1–P4)
                  </p>
                  {(['P1', 'P2', 'P3', 'P4'] as InternatPhase[]).map((phase) => (
                    <div key={phase} className="clay-card-sm p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-lavender-600">{phase}</span>
                        <label className="flex items-center gap-2 text-xs text-slateindigo-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={internatPhases[phase].gardes}
                            onChange={(e) =>
                              setInternatPhases((prev) => ({
                                ...prev,
                                [phase]: { ...prev[phase], gardes: e.target.checked },
                              }))
                            }
                            className="w-4 h-4 rounded accent-lavender-600"
                          />
                          Has Gardes (on-call)
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="date"
                          placeholder="Start"
                          value={internatPhases[phase].start}
                          onChange={(e) =>
                            setInternatPhases((prev) => ({
                              ...prev,
                              [phase]: { ...prev[phase], start: e.target.value },
                            }))
                          }
                          className="clay-input text-sm"
                        />
                        <input
                          type="date"
                          placeholder="End"
                          value={internatPhases[phase].end}
                          onChange={(e) =>
                            setInternatPhases((prev) => ({
                              ...prev,
                              [phase]: { ...prev[phase], end: e.target.value },
                            }))
                          }
                          className="clay-input text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Hospital"
                          value={internatPhases[phase].hospital}
                          onChange={(e) =>
                            setInternatPhases((prev) => ({
                              ...prev,
                              [phase]: { ...prev[phase], hospital: e.target.value },
                            }))
                          }
                          className="clay-input text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Smart file import */}
          {step === 3 && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-lavender-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
                    Smart Curriculum Import
                  </h2>
                  <p className="text-sm text-slateindigo-400">Upload files or manually add lessons</p>
                </div>
              </div>

              <div
                className="border-2 border-dashed border-lavender-200 dark:border-lavender-700/40 rounded-2xl p-8 text-center mb-4 transition-all hover:border-lavender-400 hover:bg-lavender-50/50 dark:hover:bg-lavender-700/10 cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.txt,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Upload className="w-10 h-10 text-lavender-400 mx-auto mb-2" />
                <p className="font-semibold text-slateindigo-600 dark:text-slateindigo-200">
                  Drag & drop or click to upload
                </p>
                <p className="text-xs text-slateindigo-400 mt-1">
                  PDF, CSV, Excel, TXT, Word — auto-detects modules & lessons
                </p>
                {fileName && (
                  <p className="text-sm text-mint-500 mt-2 font-medium">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {fileName}
                  </p>
                )}
              </div>

              {/* Manual input */}
              <div className="clay-card-sm p-4 mb-4">
                <p className="text-sm font-semibold text-slateindigo-600 dark:text-slateindigo-200 mb-2">
                  Or add lessons manually (one per line, use 🔥 for tombable)
                </p>
                <div className="flex gap-2">
                  <textarea
                    value={manualLessonInput}
                    onChange={(e) => setManualLessonInput(e.target.value)}
                    placeholder={"Cardiologie - Insuffisance cardiaque\n🔥 Cardiologie - Troubles du rythme\nPneumologie - Asthme"}
                    className="clay-input text-sm min-h-[80px] resize-y"
                  />
                  <button onClick={addManualLessons} className="clay-button-secondary flex items-center gap-1 self-start">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {/* Parsed lessons list */}
              {parsedLessons.length > 0 && (
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-hide">
                  <p className="text-sm font-semibold text-slateindigo-600 dark:text-slateindigo-200">
                    {parsedLessons.length} lessons ready to import
                  </p>
                  {parsedLessons.map((lesson, idx) => (
                    <div key={idx} className="clay-card-sm p-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleTombable(idx)}
                        className={`pill-badge transition-all ${
                          lesson.isTombable
                            ? 'bg-coral-500/20 text-coral-600'
                            : 'bg-lavender-100 text-slateindigo-400 dark:bg-slateindigo-800'
                        }`}
                      >
                        {lesson.isTombable ? <Flame className="w-3 h-3" /> : <span>⚪</span>}
                        {lesson.isTombable ? 'Tombable' : 'Normal'}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slateindigo-700 dark:text-slateindigo-100 truncate">
                          {lesson.lessonTitle}
                        </p>
                        <p className="text-xs text-slateindigo-400">{lesson.moduleName}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCategory(idx, 'biologique')}
                          className={`p-1.5 rounded-lg transition-all ${
                            lesson.category === 'biologique'
                              ? 'bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30'
                              : 'text-slateindigo-300'
                          }`}
                          title="Biologique"
                        >
                          <FlaskConical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCategory(idx, 'clinique')}
                          className={`p-1.5 rounded-lg transition-all ${
                            lesson.category === 'clinique'
                              ? 'bg-lavender-100 text-lavender-700 dark:bg-lavender-700/30'
                              : 'text-slateindigo-300'
                          }`}
                          title="Clinique"
                        >
                          <Stethoscope className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeParsedLesson(idx)}
                          className="p-1.5 rounded-lg text-coral-500 hover:bg-coral-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: 3-Couches strategy */}
          {step === 4 && (
            <div className="animate-slide-up">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-lavender-100 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-lavender-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
                    3-Couches Strategy Split
                  </h2>
                  <p className="text-sm text-slateindigo-400">Allocate your study time across 3 layers</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="clay-card-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-lavender-600">Couche 1 — Deep Learning</span>
                      <p className="text-xs text-slateindigo-400">First pass, learning new material</p>
                    </div>
                    <span className="text-2xl font-bold font-display text-lavender-600">{couche1}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={couche1}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCouche1(v);
                      const remaining = 100 - v;
                      setCouche2(Math.round(remaining * 0.6));
                      setCouche3(Math.round(remaining * 0.4));
                    }}
                    className="w-full accent-lavender-600"
                  />
                </div>

                <div className="clay-card-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-mint-500">Couche 2 — Consolidation</span>
                      <p className="text-xs text-slateindigo-400">Review, QCM practice, reinforcement</p>
                    </div>
                    <span className="text-2xl font-bold font-display text-mint-500">{couche2}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={couche2}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setCouche2(v);
                      const remaining = 100 - couche1 - v;
                      setCouche3(Math.max(0, remaining));
                    }}
                    className="w-full accent-mint-500"
                  />
                </div>

                <div className="clay-card-sm p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-bold text-coral-500">Couche 3 — Final Sprint</span>
                      <p className="text-xs text-slateindigo-400">Error bank review, high-yield focus</p>
                    </div>
                    <span className="text-2xl font-bold font-display text-coral-500">{couche3}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={couche3}
                    onChange={(e) => setCouche3(Number(e.target.value))}
                    className="w-full accent-coral-500"
                  />
                </div>

                <div className={`text-center text-sm font-semibold ${couche1 + couche2 + couche3 === 100 ? 'text-mint-500' : 'text-coral-500'}`}>
                  Total: {couche1 + couche2 + couche3}% {couche1 + couche2 + couche3 === 100 ? '✓' : '(must equal 100%)'}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="clay-button-secondary flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < totalSteps ? (
              <button
                onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
                disabled={!canProceed()}
                className="clay-button flex items-center gap-1 disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={finish}
                disabled={!canProceed() || saving}
                className="clay-button flex items-center gap-1 disabled:opacity-40"
              >
                {saving ? <Sparkles className="w-4 h-4 animate-pulse-soft" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
