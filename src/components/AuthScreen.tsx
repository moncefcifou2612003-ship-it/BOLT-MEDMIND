import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Brain, Mail, Lock, User, Sparkles, CheckCircle2 } from 'lucide-react';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (mode === 'signup') {
      const { error: err } = await signUp(email, password, fullName);
      if (err) {
        setError(err);
      } else {
        setSuccessMessage(
          "Un e-mail de confirmation a été envoyé à votre boîte de réception. Veuillez vérifier votre e-mail pour activer votre compte, puis passez à la connexion (Sign In)."
        );
      }
    } else {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen page-bg flex items-center justify-center p-4 bg-grid">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-lavender-500 to-lavender-700 shadow-clay-lg mb-4">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold font-display bg-gradient-to-r from-lavender-600 to-lavender-500 bg-clip-text text-transparent">
            MEDMIND
          </h1>
          <p className="text-slateindigo-400 mt-2 text-sm">
            Your ultra-premium medical study planner
          </p>
        </div>

        <div className="clay-card p-8 animate-scale-in">
          <div className="flex gap-2 p-1 rounded-xl bg-lavender-100/50 dark:bg-slateindigo-800/50 mb-6">
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-lavender-700 shadow-clay-sm dark:bg-slateindigo-700 dark:text-lavender-300'
                  : 'text-slateindigo-400'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => { setMode('signin'); setError(null); setSuccessMessage(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-white text-lavender-700 shadow-clay-sm dark:bg-slateindigo-700 dark:text-lavender-300'
                  : 'text-slateindigo-400'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slateindigo-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="clay-input pl-11"
                    placeholder="Dr. Amine Benali"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slateindigo-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="clay-input pl-11"
                  placeholder="amine@univ.dz"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slateindigo-600 dark:text-slateindigo-200 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slateindigo-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="clay-input pl-11"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-coral-500 bg-coral-500/10 rounded-lg px-4 py-2.5 animate-slide-down">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg p-4 space-y-3 animate-slide-down border border-emerald-500/20">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p>{successMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setSuccessMessage(null); }}
                  className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Aller vers Sign In (Connexion)
                </button>
              </div>
            )}

            {!successMessage && (
              <button
                type="submit"
                disabled={loading}
                className="clay-button w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <Sparkles className="w-5 h-5 animate-pulse-soft" />
                ) : mode === 'signup' ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            )}
          </form>
        </div>
        <p className="text-center text-xs text-slateindigo-400 mt-6">
          For Algerian 6th-year medical students preparing for the Residency exam
        </p>
      </div>
    </div>
  );
}