import React, { useState } from 'react';
import { Radar, Sun, Moon, ArrowRight, AlertCircle, Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPasswordApi } from '../services/authApi';
import { useTheme } from '../contexts/ThemeContext';

interface ForgotPasswordPageProps {
  onNavigateSignIn: () => void;
  onNavigateLanding: () => void;
}

function validateEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateSignIn,
  onNavigateLanding,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail]       = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim())          { setError('Email is required.'); return; }
    if (!validateEmail(email))  { setError('Please enter a valid email address.'); return; }

    setError('');
    setIsLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
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
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(156,184,46,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      {/* Theme toggle */}
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

        {submitted ? (
          /* ── Success State ─────────────────────────────── */
          <div className="text-center py-4">
            {/* Animated mail icon */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(214,255,63,0.08)', border: '1px solid rgba(214,255,63,0.2)', boxShadow: '0 0 32px -8px rgba(214,255,63,0.2)' }}
            >
              <Mail className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
              Check your email
            </h1>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-4)' }}>
              If <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{email}</span> is registered,
              we've sent a password-reset link. It expires in <strong style={{ color: 'var(--text-2)' }}>1 hour</strong>.
            </p>

            <div
              className="rounded-xl p-3.5 text-left mb-6 text-xs"
              style={{ background: 'rgba(214,255,63,0.05)', border: '1px solid rgba(214,255,63,0.15)', color: 'var(--text-4)' }}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                <span>
                  <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>In development?</span>{' '}
                  Check your server console for the Ethereal preview link if no SMTP is configured.
                </span>
              </div>
            </div>

            <button
              onClick={onNavigateSignIn}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer"
              style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 24px -6px var(--accent)' }}
            >
              Back to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── Form State ────────────────────────────────── */
          <>
            <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
              Forgot password?
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text-4)' }}>
              Enter your account email and we'll send you a reset link.
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
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none border transition-all"
                  style={{ background: 'var(--surface-3)', borderColor: 'var(--border-2)', color: 'var(--text-1)', caretColor: 'var(--accent)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border-2)')}
                />
              </div>

              {/* Submit */}
              <button
                id="forgot-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer mt-2 disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 24px -6px var(--accent)' }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-5)' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              onClick={onNavigateSignIn}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer hover:underline"
              style={{ color: 'var(--text-4)' }}
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: 'var(--text-5)' }}>
        © {new Date().getFullYear()} ProjectLens AI · Requirement-to-Code Traceability
      </p>
    </div>
  );
};
