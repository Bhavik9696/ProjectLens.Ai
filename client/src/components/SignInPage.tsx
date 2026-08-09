import React, { useState } from 'react';
import { Radar, Eye, EyeOff, Sun, Moon, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SignInPageProps {
  onNavigateSignUp: () => void;
  onNavigateLanding: () => void;
}

function validateEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export const SignInPage: React.FC<SignInPageProps> = ({ onNavigateSignUp, onNavigateLanding }) => {
  const { signIn } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): string => {
    if (!email.trim()) return 'Email is required.';
    if (!validateEmail(email)) return 'Please enter a valid email address.';
    if (!password) return 'Password is required.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      // AuthContext sets user; App.tsx watches and navigates automatically
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
    >
      {/* Background glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(214,255,63,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '0', right: '0', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(156,184,46,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        className="fixed top-5 right-5 z-50 inline-flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer"
        style={{ background: 'var(--panel)', borderColor: 'var(--border-2)', color: 'var(--text-4)' }}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border shadow-2xl p-8"
        style={{ background: 'var(--panel)', borderColor: 'var(--border-2)', boxShadow: '0 0 60px -20px rgba(214,255,63,0.08)' }}
      >
        {/* Logo */}
        <button onClick={onNavigateLanding} className="flex items-center gap-2.5 mb-8 group cursor-pointer">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ background: 'var(--accent-glow)', borderColor: 'var(--border-glow)', boxShadow: '0 0 16px rgba(214,255,63,0.2)' }}
          >
            <Radar className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-1)' }}>
            ProjectLens<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </button>

        <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
          Welcome back
        </h1>
        <p className="text-sm mb-7" style={{ color: 'var(--text-4)' }}>
          Sign in to continue to your workspace.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Error banner */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm border"
              style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none border transition-all"
              style={{
                background: 'var(--surface-3)',
                borderColor: 'var(--border-2)',
                color: 'var(--text-1)',
                caretColor: 'var(--accent)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-2)')}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none border transition-all"
                style={{
                  background: 'var(--surface-3)',
                  borderColor: 'var(--border-2)',
                  color: 'var(--text-1)',
                  caretColor: 'var(--accent)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-2)')}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--text-5)' }}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer mt-2 disabled:opacity-60"
            style={{
              background: 'var(--accent)',
              color: '#000',
              boxShadow: '0 0 24px -6px var(--accent)',
            }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Sign In <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-5)' }}>OR</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--text-4)' }}>
          Don't have an account?{' '}
          <button
            onClick={onNavigateSignUp}
            className="font-semibold cursor-pointer hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            Sign Up
          </button>
        </p>
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: 'var(--text-5)' }}>
        © {new Date().getFullYear()} ProjectLens AI · Requirement-to-Code Traceability
      </p>
    </div>
  );
};
