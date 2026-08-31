import React, { useState } from 'react';
import { Radar, Eye, EyeOff, Sun, Moon, ArrowRight, ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SignUpPageProps {
  onNavigateSignIn: () => void;
  onNavigateLanding: () => void;
}

function validateEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

const REQUIREMENTS = [
  { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
  { label: 'One letter',            test: (p: string) => /[a-zA-Z]/.test(p) },
  { label: 'One number',            test: (p: string) => /\d/.test(p) },
];

export const SignUpPage: React.FC<SignUpPageProps> = ({ onNavigateSignIn, onNavigateLanding }) => {
  const { signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [passTouch, setPassTouch]   = useState(false);

  const validate = (): string => {
    if (!name.trim())           return 'Full name is required.';
    if (!email.trim())          return 'Email is required.';
    if (!validateEmail(email))  return 'Please enter a valid email address.';
    if (password.length < 6)    return 'Password must be at least 6 characters.';
    if (password !== confirm)   return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validate();
    if (msg) { setError(msg); return; }
    setError('');
    setIsLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-3)',
    borderColor: 'var(--border-2)',
    color: 'var(--text-1)',
    caretColor: 'var(--accent)',
  };

  const focusAccent = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--accent)');
  const blurBorder = (e: React.FocusEvent<HTMLInputElement>) =>
    (e.target.style.borderColor = 'var(--border-2)');

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

      {/* Back to Landing — top left */}
      <button
        id="signup-back-btn"
        onClick={onNavigateLanding}
        title="Back to Home"
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer transition-all hover:border-[var(--accent)]/40 hover:text-[var(--accent)] group"
        style={{ background: 'var(--panel)', borderColor: 'var(--border-2)', color: 'var(--text-4)' }}
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span className="text-xs font-semibold">Home</span>
      </button>

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
        <button onClick={onNavigateLanding} className="flex items-center gap-2.5 mb-8 cursor-pointer">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border"
            style={{ background: 'var(--accent-glow)', borderColor: 'var(--border-glow)', boxShadow: '0 0 16px rgba(214,255,63,0.2)' }}
          >
            <Radar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <span className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-1)' }}>
            ProjectLens<span style={{ color: 'var(--accent)' }}>AI</span>
          </span>
        </button>

        <h1 className="text-2xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
          Create your account
        </h1>
        <p className="text-sm mb-7" style={{ color: 'var(--text-4)' }}>
          Start tracking requirements against real code today.
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

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Full name</label>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="Jane Smith"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none border transition-all"
              style={inputStyle}
              onFocus={focusAccent}
              onBlur={blurBorder}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Email address</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none border transition-all"
              style={inputStyle}
              onFocus={focusAccent}
              onBlur={blurBorder}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); setPassTouch(true); }}
                placeholder="••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 pr-10 text-sm outline-none border transition-all"
                style={inputStyle}
                onFocus={focusAccent}
                onBlur={blurBorder}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-5)' }}>
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
            <label className="block text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Confirm password</label>
            <div className="relative">
              <input
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
                onFocus={focusAccent}
                onBlur={blurBorder}
              />
              <button type="button" onClick={() => setShowConf((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: 'var(--text-5)' }}>
                {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p className="text-[11px]" style={{ color: '#f87171' }}>Passwords do not match</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all cursor-pointer mt-2 disabled:opacity-60"
            style={{ background: 'var(--accent)', color: '#000', boxShadow: '0 0 24px -6px var(--accent)' }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>Create Account <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          <span className="text-xs" style={{ color: 'var(--text-5)' }}>OR</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Google OAuth */}
        <a
          href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/google`}
          id="google-signup-btn"
          className="w-full flex items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-semibold border transition-all cursor-pointer hover:border-[var(--accent)]/40 hover:bg-[var(--surface-3)] mb-6"
          style={{ background: 'var(--surface-3)', borderColor: 'var(--border-2)', color: 'var(--text-2)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <p className="text-center text-sm" style={{ color: 'var(--text-4)' }}>
          Already have an account?{' '}
          <button onClick={onNavigateSignIn} className="font-semibold cursor-pointer hover:underline" style={{ color: 'var(--accent)' }}>
            Sign In
          </button>
        </p>
      </div>

      <p className="mt-6 text-xs text-center" style={{ color: 'var(--text-5)' }}>
        © {new Date().getFullYear()} ProjectLens AI · Requirement-to-Code Traceability
      </p>
    </div>
  );
};
