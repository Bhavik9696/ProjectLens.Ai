import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowRight,
  Play,
  GitBranch,
  FileText,
  Radar,
  Bot,
  Database,
  Component,
  Server,
  Github,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Sun,
  Moon,
  Zap,
  Gift,
  Star,
  Loader2,
  Menu,
  X,
  Lock,
  Shield,
  EyeOff,
  Ban,
  ArrowDown,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { createPaymentOrderApi, verifyPaymentApi } from '../services/api';

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

// Scoped design tokens for the landing page — computed based on active theme
// so both dark and light modes work correctly.
function getTokens(isDark: boolean): React.CSSProperties {
  return isDark
    ? {
        ['--lens-bg' as any]:          '#0a0a0a',
        ['--lens-panel' as any]:       '#131313',
        ['--lens-panel-2' as any]:     '#17170e',
        ['--lens-border' as any]:      'rgba(255,255,255,0.09)',
        ['--lens-accent' as any]:      '#d6ff3f',
        ['--lens-accent-dim' as any]:  '#9cb82e',
        ['--lens-text' as any]:        '#f5f5f1',
        ['--lens-text-dim' as any]:    '#9a9a92',
      }
    : {
        ['--lens-bg' as any]:          '#f5f5f0',
        ['--lens-panel' as any]:       '#ffffff',
        ['--lens-panel-2' as any]:     '#fffef5',
        ['--lens-border' as any]:      'rgba(0,0,0,0.10)',
        ['--lens-accent' as any]:      '#8aaa00',
        ['--lens-accent-dim' as any]:  '#6a8800',
        ['--lens-text' as any]:        '#111110',
        ['--lens-text-dim' as any]:    '#666660',
      };
}

const NAV_LINKS = [
  { label: 'Features',    href: '#features'    },
  { label: 'Privacy',     href: '#privacy'     },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing',     href: '#pricing'     },
];

const INTEGRATIONS = [
  { icon: Github,   label: 'GitHub'    },
  { icon: Database, label: 'MongoDB'   },
  { icon: Server,   label: 'Express'   },
  { icon: Component,label: 'React'     },
  { icon: Sparkles, label: 'Gemini AI' },
];

const FEATURES = [
  {
    icon: FileText,
    title: 'Requirement Extraction',
    desc: 'Paste or upload an SRS and ProjectLens parses it into structured, trackable requirements automatically.',
  },
  {
    icon: Radar,
    title: 'Code-Level Verification',
    desc: 'Every requirement is checked against real files, routes, and commits in your GitHub repository — not a guess.',
  },
  {
    icon: ShieldCheck,
    title: 'Project Health Scoring',
    desc: 'A single weighted score blends requirement coverage, code coverage, and repo activity into one risk rating.',
  },
  {
    icon: Bot,
    title: 'AI Copilot',
    desc: 'Ask what shipped, what is missing, or what to prioritize next — every answer cites the exact evidence behind it.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Upload your spec',
    desc: 'Drop in an SRS, proposal, or sprint doc. ProjectLens extracts every requirement and expected component.',
  },
  {
    n: '02',
    title: 'Connect the repo',
    desc: 'Point it at a GitHub repository. It reads the file tree, commits, pull requests, and open issues.',
  },
  {
    n: '03',
    title: 'Get real coverage',
    desc: 'See exactly what is implemented, what is partial, and what was never built — with file-level evidence.',
  },
];

const CREDIT_PACKS = [
  {
    id: 'pack_5',
    credits: 5,
    price: 129,
    priceLabel: '₹129',
    perCredit: '₹25.8 / project',
    desc: 'Perfect for freelancers and small teams getting started.',
    popular: false,
    badge: 'Starter',
  },
  {
    id: 'pack_10',
    credits: 10,
    price: 249,
    priceLabel: '₹249',
    perCredit: '₹24.9 / project',
    desc: 'Great value for active developers managing multiple products.',
    popular: true,
    badge: 'Most Popular',
  },
  {
    id: 'pack_25',
    credits: 25,
    price: 549,
    priceLabel: '₹549',
    perCredit: '₹21.9 / project',
    desc: 'Ideal for growing teams with continuous delivery pipelines.',
    popular: false,
    badge: 'Pro',
  },
  {
    id: 'pack_50',
    credits: 50,
    price: 999,
    priceLabel: '₹999',
    perCredit: '₹19.9 / project',
    desc: 'Best rate for agencies and large engineering organizations.',
    popular: false,
    badge: 'Enterprise',
  },
];

const ALL_FEATURES_INCLUDED = [
  'SRS Requirement Extraction',
  'GitHub Code Verification',
  'Traceability Matrix (RTM)',
  'Coverage Engine',
  'Project Health Score',
  'AI Copilot (Gemini RAG)',
  'PDF Report Export',
  'Unlimited Team Members',
];

// Dynamically load the Razorpay checkout script
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Smooth-scroll to a section by ID
function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onSignIn, onSignUp }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, addPaidCredits, refreshCredits } = useAuth();
  const { showToast } = useToast();
  const isDark = theme === 'dark';
  const tokens = getTokens(isDark);
  const [processingPack, setProcessingPack] = useState<string | null>(null);
  const [paymentMode, setPaymentMode]       = useState<'live' | 'simulation' | null>(null);
  const [mobileNavOpen, setMobileNavOpen]   = useState(false);

  // ── Cursor glow ──────────────────────────────────────────────────────
  const glowRef = useRef<HTMLDivElement>(null);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    const move = (e: MouseEvent) => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (!glowRef.current) return;
        glowRef.current.style.transform = `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
        glowRef.current.style.opacity = '1';
      });
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(rafRef.current); };
  }, []);

  // Fetch payment mode once (simulation vs live)
  useEffect(() => {
    fetch('/api/payments/mode')
      .then((r) => r.json())
      .then((d) => setPaymentMode(d.mode))
      .catch(() => setPaymentMode('simulation'));
  }, []);
  // ─────────────────────────────────────────────────────────────────────

  // ── Purchase handler ─────────────────────────────────────────────────
  const handlePurchase = async (packId: string) => {
    // If not logged in, redirect to sign-up first
    if (!user) {
      if (onSignUp) { onSignUp(); return; }
      if (onSignIn) { onSignIn(); return; }
      onGetStarted();
      return;
    }

    setProcessingPack(packId);
    try {
      const orderData = await createPaymentOrderApi(packId);

      // Simulation mode — no Razorpay popup
      if (orderData.simulation || paymentMode === 'simulation') {
        await new Promise((r) => setTimeout(r, 1000));
        const result = await verifyPaymentApi({
          razorpay_order_id:   orderData.orderId,
          razorpay_payment_id: `sim_pay_${Date.now()}`,
          razorpay_signature:  'simulation',
          packId,
        } as any);
        if (result.success) {
          addPaidCredits(result.creditsAdded);
          await refreshCredits();
          showToast(`🎉 ${result.creditsAdded} project credits added!`, 'success');
        }
        return;
      }

      // Live Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast('Could not load payment gateway. Please check your connection.', 'error');
        return;
      }

      await new Promise<void>((resolve) => {
        const options: any = {
          key:         orderData.keyId,
          amount:      orderData.amount,
          currency:    orderData.currency,
          name:        'ProjectLens AI',
          description: `${orderData.label}`,
          order_id:    orderData.orderId,
          prefill:     { name: user.name, email: user.email },
          theme:       { color: isDark ? '#d6ff3f' : '#8aaa00' },
          handler: async (response: any) => {
            try {
              const result = await verifyPaymentApi({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                packId,
              });
              if (result.success) {
                addPaidCredits(result.creditsAdded);
                await refreshCredits();
                showToast(`🎉 ${result.creditsAdded} project credits added!`, 'success');
              }
            } catch (e: any) {
              showToast(e.message || 'Payment verification failed.', 'error');
            }
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate payment. Please try again.', 'error');
    } finally {
      setProcessingPack(null);
    }
  };
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div style={tokens} className="min-h-screen bg-[var(--lens-bg)] text-[var(--lens-text)] font-sans antialiased selection:bg-[var(--lens-accent)]/30 selection:text-[var(--lens-accent)] overflow-x-hidden">

      {/* ── Cursor glow orb ── */}
      <div
        ref={glowRef}
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0, width: 600, height: 600,
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(214,255,63,0.10) 0%, rgba(156,184,46,0.05) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(138,170,0,0.08)  0%, rgba(100,130,0,0.04)  40%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0,
          opacity: 0, willChange: 'transform',
          transition: 'transform 0.12s ease-out, opacity 0.4s ease',
        }}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Nav                                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto">
          {/* ── Nav bar row ── */}
          <nav
            className="flex items-center justify-between rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)]/95 backdrop-blur-md px-4 py-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
          >
            {/* Brand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--lens-accent)]/15 border border-[var(--lens-accent)]/30 flex items-center justify-center">
                <Radar className="w-4 h-4 text-[var(--lens-accent)]" />
              </div>
              <span className="font-extrabold tracking-tight text-[15px]">ProjectLens<span className="text-[var(--lens-accent)]"> AI</span></span>
            </div>

            {/* Desktop centre links */}
            <div className="hidden md:flex items-center gap-7 text-[13px] font-medium" style={{ color: 'var(--lens-text-dim)' }}>
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href.slice(1))}
                  className="hover:text-[var(--lens-text)] transition-colors cursor-pointer bg-transparent border-0 p-0"
                  style={{ color: 'inherit' }}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop right actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                id="landing-theme-toggle-btn"
                onClick={toggleTheme}
                title={isDark ? 'Light Mode' : 'Dark Mode'}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--lens-panel)] hover:bg-[var(--lens-panel-2)] border border-[var(--lens-border)] hover:border-[var(--lens-accent)]/40 transition-colors cursor-pointer flex-shrink-0"
                style={{ color: 'var(--lens-text-dim)' }}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                id="landing-signin-btn"
                onClick={onSignIn || onGetStarted}
                className="text-[13px] font-semibold cursor-pointer transition-colors hover:text-[var(--lens-accent)]"
                style={{ color: 'var(--lens-text-dim)' }}
              >
                Sign In
              </button>
              <button
                id="landing-getstarted-btn"
                onClick={onSignUp || onGetStarted}
                className="px-4 py-2 rounded-xl bg-[var(--lens-accent)] text-black text-[13px] font-bold hover:brightness-110 transition-all shadow-[0_0_20px_-4px_var(--lens-accent)] cursor-pointer"
              >
                Get Started
              </button>
            </div>

            {/* Mobile: theme + hamburger only */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--lens-panel)] border border-[var(--lens-border)] cursor-pointer flex-shrink-0"
                style={{ color: 'var(--lens-text-dim)' }}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setMobileNavOpen((o) => !o)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--lens-panel)] border border-[var(--lens-border)] cursor-pointer flex-shrink-0"
                style={{ color: 'var(--lens-text-dim)' }}
                aria-label="Open menu"
              >
                {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </nav>

          {/* ── Mobile dropdown ── */}
          {mobileNavOpen && (
            <div
              className="md:hidden mt-2 rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)]/98 backdrop-blur-md p-4 space-y-1 shadow-xl"
            >
              {/* Nav links */}
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => { scrollTo(link.href.slice(1)); setMobileNavOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-[14px] font-semibold transition-colors cursor-pointer"
                  style={{ color: 'var(--lens-text-dim)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--lens-accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--lens-text-dim)')}
                >
                  {link.label}
                </button>
              ))}

              {/* Divider */}
              <div className="h-px mx-1" style={{ background: 'var(--lens-border)' }} />

              {/* Auth buttons */}
              <button
                onClick={() => { (onSignIn || onGetStarted)(); setMobileNavOpen(false); }}
                className="w-full px-4 py-3 rounded-xl text-[14px] font-semibold text-center cursor-pointer transition-colors"
                style={{ color: 'var(--lens-text-dim)' }}
              >
                Sign In
              </button>
              <button
                onClick={() => { (onSignUp || onGetStarted)(); setMobileNavOpen(false); }}
                className="w-full px-4 py-3 rounded-xl text-[14px] font-bold text-center cursor-pointer transition-all"
                style={{
                  background: 'var(--lens-accent)',
                  color: '#000',
                  boxShadow: '0 0 20px -4px var(--lens-accent)',
                }}
              >
                Get Started — Free
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-[var(--lens-accent)]/10 blur-[100px] rounded-full" />
        <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-[var(--lens-accent)]/10 blur-[100px] rounded-full" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10 relative">
          <div className="flex justify-center mb-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lens-accent)]/30 bg-[var(--lens-accent)]/10 px-4 py-1.5 text-[12px] font-mono text-[var(--lens-accent)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--lens-accent)] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--lens-accent)]" />
              </span>
              Live Requirement-to-Code Sync
            </div>
          </div>

          <h1 className="text-center font-extrabold tracking-tight leading-[1.05] text-[42px] sm:text-[56px] md:text-[64px]">
            Know What's Actually
            <br />
            <span className="text-[var(--lens-accent)]">Built</span>, Not Promised
          </h1>

          <p className="max-w-xl mx-auto text-center mt-6 text-[15px] sm:text-base text-[var(--lens-text-dim)] leading-relaxed">
            ProjectLens AI compares your requirement documents against real GitHub code, so every
            status update is backed by evidence — not a guess.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-9">
            <button
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--lens-accent)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_30px_-6px_var(--lens-accent)] cursor-pointer"
            >
              Launch ProjectLens
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => scrollTo('pricing')}
              className="inline-flex items-center gap-2.5 text-sm font-semibold text-[var(--lens-text)] cursor-pointer"
            >
              <span className="w-9 h-9 rounded-full bg-[var(--lens-panel-2)] border border-[var(--lens-border)] flex items-center justify-center">
                <Play className="w-3.5 h-3.5 fill-current text-[var(--lens-accent)] ml-0.5" />
              </span>
              See Pricing
            </button>
          </div>
          <p className="text-center text-[12px] font-mono text-[var(--lens-text-dim)]/70 mt-3">
            First 2 projects free — no credit card required
          </p>
          <div className="flex items-center justify-center gap-3 mt-2.5">
            {(['🔐\u00a0Privacy-first', 'RAG-powered', 'Secrets redacted'] as const).map((item, i, arr) => (
              <React.Fragment key={item}>
                <span
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: 'var(--lens-accent-dim)', opacity: 0.75 }}
                >
                  {item}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-[10px]" style={{ color: 'var(--lens-text-dim)', opacity: 0.35 }}>•</span>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="relative h-[260px] sm:h-[300px] mt-14 max-w-3xl mx-auto">
            <CoverageCard
              className="absolute left-0 sm:left-4 top-16 sm:top-20 -rotate-6 w-[210px] sm:w-[240px]"
              module="Authentication"
              percent={62}
              status="Partial"
            />
            <CoverageCard
              className="absolute right-0 sm:right-4 top-0 rotate-3 w-[240px] sm:w-[270px]"
              module="Payment Gateway"
              percent={94}
              status="Implemented"
              elevated
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Marquee ribbon                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="mt-4 mb-24 overflow-hidden">
        <p className="text-center text-[11px] font-mono tracking-[0.2em] text-[var(--lens-text-dim)] mb-4">
          INTEGRATES WITH YOUR STACK
        </p>
        <div className="-rotate-2 -mx-8">
          <div className="bg-gradient-to-r from-[var(--lens-accent-dim)] via-[var(--lens-accent)] to-[var(--lens-accent-dim)] py-4">
            <div className="flex items-center gap-16 animate-[marquee_22s_linear_infinite] whitespace-nowrap w-max">
              {[...INTEGRATIONS, ...INTEGRATIONS, ...INTEGRATIONS].map(({ icon: Icon, label }, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 text-black/85 font-bold text-[15px]">
                  <Icon className="w-4 h-4" strokeWidth={2.5} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Features                                                         */}
      {/* ---------------------------------------------------------------- */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-4 scroll-mt-24">
        <div className="max-w-xl mb-12">
          <p className="text-[12px] font-mono tracking-[0.2em] text-[var(--lens-accent)] mb-3">WHAT IT DOES</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Evidence, not status meetings
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)] p-5 hover:border-[var(--lens-accent)]/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--lens-accent)]/10 border border-[var(--lens-accent)]/25 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-[var(--lens-accent)]" />
              </div>
              <h3 className="font-bold text-[15px] mb-2">{title}</h3>
              <p className="text-[13px] text-[var(--lens-text-dim)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Privacy & Security Section                                       */}
      {/* ---------------------------------------------------------------- */}
      <section id="privacy" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-24">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lens-accent)]/30 bg-[var(--lens-accent)]/8 px-4 py-1.5 text-[11px] font-mono tracking-[0.18em] text-[var(--lens-accent)] mb-6">
            <Lock className="w-3 h-3" />
            YOUR CODE. YOUR DATA. PROTECTED.
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-5">
            Privacy-first AI analysis
            <br />
            <span className="text-[var(--lens-accent)]">for your codebase</span>
          </h2>
          <p className="max-w-2xl mx-auto text-[15px] text-[var(--lens-text-dim)] leading-relaxed">
            ProjectLens AI uses privacy-first RAG to analyze only the repository evidence relevant to
            each requirement. Your entire codebase is never blindly sent to an AI model.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* Left — pipeline visual */}
          <div className="rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)] p-7 relative overflow-hidden">
            {/* Subtle glow behind pipeline */}
            <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[var(--lens-accent)]/6 blur-3xl" />

            <p className="text-[11px] font-mono tracking-[0.18em] text-[var(--lens-accent)] mb-7">ANALYSIS PIPELINE</p>

            {/* Pipeline steps */}
            {[
              { label: 'Your Repository',           note: 'File tree, commits, pull requests' },
              { label: 'Local Processing',           note: 'File classification, code graph build' },
              { label: 'Secret Detection',           note: '.env, API keys, tokens, credentials' },
              { label: 'Relevant Evidence Retrieval',note: 'Requirement-specific RAG retrieval' },
              { label: 'Sensitive Data Redaction',   note: 'Keys, passwords, secrets replaced' },
              { label: 'AI Analysis',                note: 'Only relevant evidence sent to model' },
            ].map((step, idx, arr) => (
              <div key={step.label} className="relative">
                <div className="flex items-start gap-4">
                  {/* Connector line */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border flex-shrink-0"
                      style={{
                        background: idx === arr.length - 1
                          ? 'var(--lens-accent)'
                          : idx === 2 || idx === 4
                          ? 'rgba(214,255,63,0.15)'
                          : 'var(--lens-panel-2)',
                        borderColor: idx === arr.length - 1
                          ? 'var(--lens-accent)'
                          : 'var(--lens-border)',
                        color: idx === arr.length - 1 ? '#000' : 'var(--lens-accent)',
                      }}
                    >
                      {idx === arr.length - 1
                        ? <Sparkles className="w-3.5 h-3.5" />
                        : idx === 2 || idx === 4
                        ? <Shield className="w-3.5 h-3.5" />
                        : <span>{idx + 1}</span>}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="w-px flex-1 my-1" style={{ minHeight: '24px', background: 'var(--lens-border)' }} />
                    )}
                  </div>
                  {/* Step content */}
                  <div className="pb-5">
                    <p className="font-semibold text-[14px]" style={{ color: 'var(--lens-text)' }}>
                      {step.label}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--lens-text-dim)' }}>
                      {step.note}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Redaction visual */}
            <div className="mt-2 rounded-xl border border-[var(--lens-border)] bg-[var(--lens-bg)]/60 p-4 font-mono text-[12px] leading-6 overflow-x-auto">
              <p className="text-[10px] font-sans tracking-[0.15em] text-[var(--lens-text-dim)] mb-3">SECRET REDACTION EXAMPLE</p>
              <div className="space-y-1">
                <div className="flex gap-3">
                  <span className="text-red-400/70 select-none">─</span>
                  <span style={{ color: 'var(--lens-text-dim)' }}>DATABASE_URL=mongodb+srv://username:<span className="text-red-400/80">p4ssw0rd</span>@cluster0…</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-red-400/70 select-none">─</span>
                  <span style={{ color: 'var(--lens-text-dim)' }}>API_KEY=sk-<span className="text-red-400/80">live_abc123xyz</span></span>
                </div>
                <div className="mt-2 pt-2 border-t border-[var(--lens-border)] space-y-1">
                  <div className="flex gap-3">
                    <span className="text-[var(--lens-accent)] select-none">+</span>
                    <span style={{ color: 'var(--lens-text)' }}>DATABASE_URL=mongodb+srv://username:<span className="font-bold text-[var(--lens-accent)]">[REDACTED]</span>@cluster0…</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[var(--lens-accent)] select-none">+</span>
                    <span style={{ color: 'var(--lens-text)' }}>API_KEY=<span className="font-bold text-[var(--lens-accent)]">[API_KEY_REDACTED]</span></span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-[var(--lens-accent)] select-none">+</span>
                    <span style={{ color: 'var(--lens-text)' }}>JWT_SECRET=<span className="font-bold text-[var(--lens-accent)]">[REDACTED]</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right — cards + trust statement */}
          <div className="flex flex-col gap-4">
            {/* 4 security cards */}
            {[
              {
                Icon: ShieldCheck,
                title: 'Privacy-First RAG',
                desc: 'Only the code and evidence relevant to a specific requirement is selected for AI analysis. Unrelated files are never included.',
              },
              {
                Icon: Lock,
                title: 'Secret Detection & Redaction',
                desc: 'API keys, passwords, tokens, database credentials, JWT secrets, private keys, and .env files are detected and redacted before any AI processing.',
              },
              {
                Icon: Sparkles,
                title: 'Evidence-Based AI',
                desc: 'AI analyzes relevant files, functions, APIs, services, models, and tests — instead of processing the entire repository blindly.',
              },
              {
                Icon: Ban,
                title: 'Minimum Necessary Data',
                desc: 'Unrelated source code and sensitive repository data are excluded. Only the minimum evidence required to evaluate a requirement is processed.',
              },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--lens-border)] bg-[var(--lens-panel)] p-5 flex gap-4 hover:border-[var(--lens-accent)]/40 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--lens-accent)]/10 border border-[var(--lens-accent)]/25 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[var(--lens-accent)]/20 transition-colors">
                  <Icon className="w-5 h-5 text-[var(--lens-accent)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[14px] mb-1" style={{ color: 'var(--lens-text)' }}>{title}</h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--lens-text-dim)' }}>{desc}</p>
                </div>
              </div>
            ))}

            {/* Trust statement */}
            <div className="rounded-2xl border border-[var(--lens-accent)]/25 bg-[var(--lens-accent)]/6 p-5 relative overflow-hidden">
              <div className="pointer-events-none absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[var(--lens-accent)]/10 blur-2xl" />
              <p className="text-[13px] leading-relaxed relative z-10" style={{ color: 'var(--lens-text)' }}>
                <span className="font-bold text-[var(--lens-accent)]">Minimum-data approach:</span>{' '}
                only the evidence required to answer a specific requirement is processed by the AI.
                Entire codebases, unrelated modules, and sensitive credentials are excluded by design.
              </p>
            </div>

            {/* Trust badge row */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { emoji: '🔐', label: 'Privacy First' },
                { emoji: '🧠', label: 'RAG-Powered' },
                { emoji: '🚫', label: 'Secret Redaction' },
                { emoji: '📁', label: 'Evidence-Based' },
              ].map(({ emoji, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--lens-border)] bg-[var(--lens-panel)] px-3.5 py-1.5 text-[12px] font-semibold"
                  style={{ color: 'var(--lens-text-dim)' }}
                >
                  <span className="text-[13px]">{emoji}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* How it works                                                     */}
      {/* ---------------------------------------------------------------- */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-24">
        <div className="max-w-xl mb-12">
          <p className="text-[12px] font-mono tracking-[0.2em] text-[var(--lens-accent)] mb-3">THE FLOW</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Three steps to real coverage</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, i) => (
            <div key={step.n} className="relative">
              <span className="font-mono text-[13px] text-[var(--lens-accent)]">{step.n}</span>
              <h3 className="text-lg font-bold mt-3 mb-2">{step.title}</h3>
              <p className="text-[13px] text-[var(--lens-text-dim)] leading-relaxed">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1.5 -right-4 w-8 h-px bg-[var(--lens-border)]" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================ */}
      {/* Pricing Section                                                  */}
      {/* ================================================================ */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-6 py-24 scroll-mt-24">
        {/* Section header */}
        <div className="text-center mb-5">
          <p className="text-[12px] font-mono tracking-[0.2em] text-[var(--lens-accent)] mb-3">PRICING</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Simple, project-based credits
          </h2>
          <p className="text-[var(--lens-text-dim)] text-[15px] max-w-lg mx-auto leading-relaxed">
            Pay only for what you build. No subscriptions, no seat fees.
          </p>
        </div>

        {/* Free tier banner */}
        <div className="relative rounded-2xl border border-[var(--lens-accent)]/35 bg-[var(--lens-panel-2)] px-6 py-5 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 overflow-hidden">
          <div className="pointer-events-none absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[var(--lens-accent)]/8 blur-3xl" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-[var(--lens-accent)]/15 border border-[var(--lens-accent)]/35 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-[var(--lens-accent)]" />
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color: 'var(--lens-text)' }}>
                Your first 2 projects are completely <span style={{ color: 'var(--lens-accent)' }}>FREE</span>
              </p>
              <p className="text-[13px]" style={{ color: 'var(--lens-text-dim)' }}>
                No credit card required. All features included from day one.
              </p>
            </div>
          </div>
          <button
            onClick={onSignUp || onGetStarted}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--lens-accent)] text-black text-[13px] font-bold hover:brightness-110 transition-all cursor-pointer flex-shrink-0 relative z-10"
          >
            Start Free
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px" style={{ background: 'var(--lens-border)' }} />
          <span className="text-[11px] font-mono tracking-widest uppercase" style={{ color: 'var(--lens-text-dim)' }}>
            Need more projects? Buy credits
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--lens-border)' }} />
        </div>

        {/* Pricing cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {CREDIT_PACKS.map((pack) => {
            const isLoading = processingPack === pack.id;
            return (
              <div
                key={pack.id}
                className="relative rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                  background:   pack.popular
                    ? (isDark ? 'linear-gradient(145deg,#161a0a,#101208)' : 'linear-gradient(145deg,#f8ffe0,#f0facc)')
                    : 'var(--lens-panel)',
                  borderColor:  pack.popular ? 'rgba(214,255,63,0.5)' : 'var(--lens-border)',
                  boxShadow:    pack.popular ? '0 0 40px -10px rgba(214,255,63,0.18)' : 'none',
                }}
              >
                {/* Popular ribbon */}
                {pack.popular && (
                  <div
                    className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold font-mono uppercase tracking-wider rounded-bl-xl flex items-center gap-1"
                    style={{ background: 'var(--lens-accent)', color: '#000' }}
                  >
                    <Star className="w-3 h-3" />
                    {pack.badge}
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  {/* Badge (non-popular) */}
                  {!pack.popular && (
                    <span
                      className="self-start text-[10px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border mb-4"
                      style={{ color: 'var(--lens-accent)', borderColor: 'rgba(214,255,63,0.25)', background: 'rgba(214,255,63,0.06)' }}
                    >
                      {pack.badge}
                    </span>
                  )}
                  {pack.popular && <div className="mt-5" />}

                  {/* Credits */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span
                      className="text-4xl font-extrabold font-mono tracking-tight"
                      style={{ color: pack.popular ? 'var(--lens-accent)' : 'var(--lens-text)' }}
                    >
                      {pack.credits}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--lens-text-dim)' }}>
                      projects
                    </span>
                  </div>

                  {/* Price */}
                  <div className="text-2xl font-extrabold mb-1" style={{ color: 'var(--lens-text)' }}>
                    {pack.priceLabel}
                  </div>
                  <div className="text-[11px] font-mono mb-4" style={{ color: 'var(--lens-text-dim)' }}>
                    {pack.perCredit}
                  </div>

                  {/* Description */}
                  <p className="text-[13px] leading-relaxed flex-1 mb-5" style={{ color: 'var(--lens-text-dim)' }}>
                    {pack.desc}
                  </p>

                  {/* CTA */}
                  <button
                    id={`pricing-${pack.id}-btn`}
                    onClick={() => handlePurchase(pack.id)}
                    disabled={!!processingPack}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={
                      pack.popular
                        ? { background: 'var(--lens-accent)', color: '#000', boxShadow: '0 0 20px -4px rgba(214,255,63,0.5)' }
                        : { background: 'transparent', color: 'var(--lens-accent)', border: '1px solid rgba(214,255,63,0.35)' }
                    }
                  >
                    {isLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…</>
                    ) : !user ? (
                      <><Zap className="w-3.5 h-3.5" /> Get Started</>
                    ) : (
                      <><Zap className="w-3.5 h-3.5" /> Purchase</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* All plans include */}
        <div
          className="rounded-2xl border p-6"
          style={{ background: 'var(--lens-panel)', borderColor: 'var(--lens-border)' }}
        >
          <p className="text-center text-[12px] font-mono tracking-[0.15em] uppercase mb-5" style={{ color: 'var(--lens-accent)' }}>
            All plans include full access to ProjectLens AI — no feature restrictions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALL_FEATURES_INCLUDED.map((f) => (
              <div key={f} className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--lens-text-dim)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--lens-accent)' }} />
                {f}
              </div>
            ))}
          </div>

          {/* Credit rules note */}
          <div
            className="mt-5 pt-4 border-t grid sm:grid-cols-3 gap-3 text-center text-[12px]"
            style={{ borderColor: 'var(--lens-border)', color: 'var(--lens-text-dim)' }}
          >
            <div className="flex flex-col items-center gap-1">
              <Gift className="w-4 h-4" style={{ color: 'var(--lens-accent)' }} />
              <span>2 free projects for every new account</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Zap className="w-4 h-4" style={{ color: 'var(--lens-accent)' }} />
              <span>Free projects always consumed before paid credits</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--lens-accent)' }} />
              <span>Buy credits anytime — even before using your free projects</span>
            </div>
          </div>
        </div>

        {/* Unauthenticated nudge */}
        {!user && (
          <p className="text-center mt-6 text-[13px]" style={{ color: 'var(--lens-text-dim)' }}>
            Clicking Purchase will take you to{' '}
            <button
              onClick={onSignIn || onGetStarted}
              className="underline underline-offset-2 font-semibold cursor-pointer"
              style={{ color: 'var(--lens-accent)' }}
            >
              Sign In
            </button>
            {' '}or{' '}
            <button
              onClick={onSignUp || onGetStarted}
              className="underline underline-offset-2 font-semibold cursor-pointer"
              style={{ color: 'var(--lens-accent)' }}
            >
              Sign Up
            </button>
            {' '}first.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing CTA                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--lens-accent)]/25 bg-[var(--lens-panel)] px-8 py-14 text-center">
          <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2 w-[420px] h-80 bg-[var(--lens-accent)]/10 blur-[100px] rounded-full" />
          <div className="relative">
            <h2 className="text-3xl sm:text-[40px] font-extrabold tracking-tight leading-tight">
              Stop reporting on faith.
              <br />
              Start reporting on <span className="text-[var(--lens-accent)]">evidence</span>.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--lens-accent)] text-black font-bold text-sm hover:brightness-110 transition-all shadow-[0_0_30px_-6px_var(--lens-accent)] cursor-pointer"
              >
                Start Free — 2 Projects Included
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollTo('pricing')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border"
                style={{ color: 'var(--lens-text-dim)', borderColor: 'var(--lens-border)' }}
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Footer                                                           */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-[var(--lens-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--lens-accent)]/15 border border-[var(--lens-accent)]/30 flex items-center justify-center">
              <Radar className="w-3 h-3 text-[var(--lens-accent)]" />
            </div>
            <span className="text-[13px] font-bold">ProjectLens AI</span>
          </div>
          <p className="text-[12px] text-[var(--lens-text-dim)]">Requirement-to-code evidence for engineering teams.</p>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

/* -------------------------------------------------------------------- */
/* CoverageCard                                                           */
/* -------------------------------------------------------------------- */
function CoverageCard({
  className = '',
  module,
  percent,
  status,
  elevated = false,
}: {
  className?: string;
  module: string;
  percent: number;
  status: 'Implemented' | 'Partial';
  elevated?: boolean;
}) {
  const isGood = status === 'Implemented';
  return (
    <div
      className={`${className} rounded-2xl border border-[var(--lens-border)] bg-gradient-to-br from-[#181818] to-[#0d0d0d] p-4 shadow-2xl ${
        elevated ? 'shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-7 h-9 rounded-md bg-[var(--lens-accent)]" />
        <span
          className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full border ${
            isGood
              ? 'text-[var(--lens-accent)] border-[var(--lens-accent)]/40 bg-[var(--lens-accent)]/10'
              : 'text-amber-300 border-amber-300/30 bg-amber-300/10'
          }`}
        >
          {status}
        </span>
      </div>

      <p className="text-[11px] font-mono text-[var(--lens-text-dim)] mb-1">{module}</p>
      <p className="text-3xl font-extrabold tracking-tight text-[var(--lens-text)] mb-4">
        {percent}<span className="text-base text-[var(--lens-text-dim)]">%</span>
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-full ${i < Math.round((percent / 100) * 6) ? 'bg-[var(--lens-accent)]' : 'bg-white/10'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 text-[var(--lens-text-dim)]">
          {isGood ? <CheckCircle2 className="w-3.5 h-3.5" /> : <GitBranch className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-mono">GitHub</span>
        </div>
      </div>
    </div>
  );
}
