import { Menu, Sun, Moon, Flame, Calendar } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';

interface TopBarProps {
  onMenuClick: () => void;
  title: string;
  subtitle?: string;
}

export function TopBar({ onMenuClick, title, subtitle }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.exam_date) {
      const exam = new Date(profile.exam_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      setDaysLeft(diff);
    }
  }, [profile?.exam_date]);

  return (
    <header className="sticky top-0 z-20 glass-nav border-b border-lavender-100/50 dark:border-lavender-700/20 px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-lavender-100 dark:hover:bg-slateindigo-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-slateindigo-600 dark:text-slateindigo-200" />
          </button>
          <div>
            <h1 className="text-xl font-bold font-display text-slateindigo-800 dark:text-slateindigo-50">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-slateindigo-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {daysLeft !== null && daysLeft > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-coral-500/15 text-coral-600 dark:text-coral-400">
              <Flame className="w-4 h-4" />
              <span className="text-sm font-semibold">{daysLeft} days to exam</span>
            </div>
          )}
          {daysLeft !== null && daysLeft <= 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-mint-500/15 text-mint-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-semibold">Exam day!</span>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-lavender-100 dark:hover:bg-slateindigo-800 transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-slateindigo-600" />
            ) : (
              <Sun className="w-5 h-5 text-lavender-300" />
            )}
          </button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lavender-400 to-lavender-600 flex items-center justify-center text-white font-bold text-sm">
            {profile?.full_name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
