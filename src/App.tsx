import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { Sidebar, type PageId } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { SettingsModal } from '@/components/SettingsModal';
import { AuthScreen } from '@/components/AuthScreen'; // تأكد بلي هذا هو اسم ملف شاشة التسجيل عندك
import { DashboardPage } from '@/pages/DashboardPage';
import { CoursModulesPage } from '@/pages/CoursModulesPage';
import { CalendrierPage } from '@/pages/CalendrierPage';
import { NotesVaultPage } from '@/pages/NotesVaultPage';
import { ResumesVaultPage } from '@/pages/ResumesVaultPage';
import { SujetsManagerPage } from '@/pages/SujetsManagerPage';
import { FlashcardsHubPage } from '@/pages/FlashcardsHubPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { InternatPage } from '@/pages/InternatPage';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Aujourd\'hui', subtitle: 'Your daily study dashboard' },
  cours: { title: 'Modules & Cours', subtitle: 'Shared master curriculum' },
  calendrier: { title: 'Calendrier d\'Études', subtitle: 'Study & Internat schedule' },
  notes: { title: 'Notes Importants', subtitle: 'High-yield traps vault' },
  resumes: { title: 'Résumés', subtitle: 'Multi-format study materials' },
  sujets: { title: 'Sujets', subtitle: 'Past exam paper tracker' },
  flashcards: { title: 'Flashcards', subtitle: 'Active recall study system' },
  admin: { title: 'Owner Dashboard', subtitle: 'Manage students & curriculum' },
  internat: { title: 'Période d\'Internat', subtitle: 'Gestion des stages et gardes (P1)' },
};

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-lavender-500 to-lavender-700 flex items-center justify-center animate-pulse-soft">
          <span className="text-white font-bold font-display text-2xl">M</span>
        </div>
      </div>
    );
  }

  // إذا لم يكن هناك session (أي غير مسجل دخول)، نعرض شاشة التسجيل الأصلية
  if (!session) {
    return <AuthScreen />;
  }

  const meta = PAGE_META[currentPage] || PAGE_META.dashboard;

  return (
    <div className="min-h-screen page-bg flex">
      <Sidebar
        current={currentPage as PageId}
        onNavigate={(p) => setCurrentPage(p)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(true)}
          title={meta.title}
          subtitle={meta.subtitle}
        />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
          {currentPage === 'dashboard' && <DashboardPage />}
          {currentPage === 'cours' && <CoursModulesPage />}
          {currentPage === 'calendrier' && <CalendrierPage />}
          {currentPage === 'notes' && <NotesVaultPage />}
          {currentPage === 'resumes' && <ResumesVaultPage />}
          {currentPage === 'sujets' && <SujetsManagerPage />}
          {currentPage === 'flashcards' && <FlashcardsHubPage />}
          {currentPage === 'internat' && <InternatPage />}
          {currentPage === 'admin' && profile?.role === 'admin' && <AdminDashboardPage />}
        </main>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;