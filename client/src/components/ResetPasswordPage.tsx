import React, { useState } from 'react';
import { Radar, Eye, EyeOff, Sun, Moon, ArrowRight, AlertCircle, Loader2, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { resetPasswordApi } from '../services/authApi';
import { useTheme } from '../contexts/ThemeContext';

interface ResetPasswordPageProps {
  token: string;                       // raw token from the URL
  onNavigateSignIn: () => void;
  onNavigateForgotPassword: () => void;
}

const REQUIREMENTS = [
  { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
  { label: 'One letter',            test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'One number',            test: (p: string) => /\d/.test(p) },
];

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token,
  onNavigateSignIn,
  onNavigateForgotPassword,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [passTouch, setPassTouch] = useState(false);
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [countdown, setCountdown] = useState(3);

  const validate = (): string => {
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirm)  return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }

    setError('');
    setIsLoading(true);
    try {
      await resetPasswordApi(token, password);
      setSuccess(true);
      // Auto-redirect countdown
      let n = 3;
      const tick = setInterval(() => {
        n -= 1;
        setCountdown(n);
        if (n <= 0) {
          clearInterval(tick);
          onNavigateSignIn();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background:   'var(--surface-3)',
    borderColor:  'var(--border-2)',
    color:        'var(--text-1)',
    caretColor:   'var(--accent)',
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
        {/* Logo — not clickable here to prevent accidental navigation */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ background: 'var(--accent-glow)', borderColor: 'var(--border-glow)', boxShadow: '0 0 16px rgba(214,255,63,0.2)' }}
          >
            <Radar className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-1)' }}>
            ProjectLens<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </div>

        {success ? (
          /* ── Success State ─────────────────────────────── */
          <div className="text-center py-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(214,255,63,0.08)', border: '1px solid rgba(214,255,63,0.2)', boxShadow: '0 0 32px -8px rgba(214,255,63,0.2)' }}
            >
              <ShieldCheck className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-1)' }}>
              Password reset!
            </h1>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-4)' }}>
              Your password has been updated successfully. Redirecting to Sign In in{' '}
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{countdown}s</span>…
            </p>
            <button
              onClick={onNavigateSignIn}
              id="reset-success-signin-btn"
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer"
              style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 24px -6px var(--accent)' }}
            >
              Sign In Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ── Form State ────────────────────────────────── */
          <>
            <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
              Set new password
            </h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text-4)' }}>
              Choose a strong password for your account.
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Error banner */}
              {error && (
                <div
                  className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm border"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{error}</p>
                    {(error.includes('expired') || error.includes('Invalid')) && (
                      <button
                        type="button"
                        onClick={onNavigateForgotPassword}
                        className="mt-1 font-semibold underline cursor-pointer"
                        style={{ color: '#f87171' }}
                      >
                        Request a new reset link →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
                  New password
                </label>
                <div className="relative">
                  <input
                    id="reset-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); setPassTouch(true); }}
                    placeholder="••••••••"
                    className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none border transition-all"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e)  => (e.target.style.borderColor = 'var(--border-2)')}
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

                {/* Password strength hints */}
                {passTouch && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {REQUIREMENTS.map(({ label, test }) => {
                      const ok = test(password);
                      return (
                        <span key={label} className="flex items-center gap-1 text-[11px]" style={{ color: ok ? 'var(--accent)' : 'var(--text-5)' }}>
                          <CheckCircle2 className="w-3 h-3" />
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="reset-confirm-password"
                    type={showConf ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                    placeholder="••••••••"
                    className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none border transition-all"
                    style={{
                      ...inputStyle,
                      borderColor: confirm && confirm !== password ? 'rgba(239,68,68,0.6)' : 'var(--border-2)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e)  => (e.target.style.borderColor = confirm && confirm !== password ? 'rgba(239,68,68,0.6)' : 'var(--border-2)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                    style={{ color: 'var(--text-5)' }}
                  >
                    {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[11px]" style={{ color: '#f87171' }}>Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <button
                id="reset-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer mt-2 disabled:opacity-60"
                style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 24px -6px var(--accent)' }}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Reset Password <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Back link */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-5)' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <button
              onClick={onNavigateForgotPassword}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer hover:underline"
              style={{ color: 'var(--text-4)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Request a new reset link
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
