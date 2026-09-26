import { Brain, LayoutDashboard, BookOpen, Calendar, Lightbulb, FileText, ClipboardList, Layers, Crown, X, Settings, LogOut, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export type PageId = 'dashboard' | 'cours' | 'calendrier' | 'notes' | 'resumes' | 'sujets' | 'flashcards' | 'admin' | 'internat';

interface SidebarProps {
  current: PageId;
  onNavigate: (page: PageId) => void;
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ current, onNavigate, open, onClose, onOpenSettings }: SidebarProps) {
  const { profile, signOut } = useAuth();

  const navItems: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Aujourd\'hui', icon: LayoutDashboard },
    { id: 'internat', label: 'Période d\'Internat', icon: Stethoscope },
    { id: 'cours', label: 'Modules & Cours', icon: BookOpen },
    { id: 'calendrier', label: 'Calendrier d\'Études', icon: Calendar },
    { id: 'notes', label: 'Notes Importants', icon: Lightbulb },
    { id: 'resumes', label: 'Résumés', icon: FileText },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'sujets', label: 'Sujets', icon: ClipboardList },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Owner Dashboard', icon: Crown });
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-slateindigo-900/30 backdrop-blur-sm z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 z-40 transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-full glass-nav border-r border-lavender-100/50 dark:border-lavender-700/20 flex flex-col p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-lavender-500 to-lavender-700 flex items-center justify-center shadow-clay-sm">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold font-display text-lg text-slateindigo-800 dark:text-slateindigo-50">MEDMIND</h1>
                <p className="text-xs text-slateindigo-400">Study Planner</p>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-slateindigo-800">
              <X className="w-5 h-5 text-slateindigo-500" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = current === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left group ${
                    isActive
                      ? 'bg-lavender-600 text-white shadow-clay-sm'
                      : 'text-slateindigo-600 dark:text-slateindigo-200 hover:bg-lavender-100/60 dark:hover:bg-slateindigo-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slateindigo-500 dark:text-slateindigo-400'}`} />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User profile & settings */}
          <div className="mt-4 pt-4 border-t border-lavender-100/50 dark:border-lavender-700/20 space-y-1">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender-400 to-lavender-600 flex items-center justify-center text-white font-bold text-sm">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slateindigo-700 dark:text-slateindigo-100 truncate">
                  {profile?.full_name}
                </p>
                <p className="text-xs text-slateindigo-400 truncate">{profile?.email}</p>
              </div>
            </div>
            <button
              onClick={onOpenSettings}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slateindigo-600 dark:text-slateindigo-200 hover:bg-lavender-100/60 dark:hover:bg-slateindigo-800/60 transition-all text-sm font-medium"
            >
              <Settings className="w-5 h-5 text-slateindigo-500" /> Settings
            </button>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-coral-500 hover:bg-coral-500/10 transition-all text-sm font-medium"
            >
              <LogOut className="w-5 h-5 text-coral-500" /> Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}