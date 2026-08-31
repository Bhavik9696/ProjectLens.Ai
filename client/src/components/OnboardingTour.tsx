import React from 'react';
import { useOnboarding, ONBOARDING_STEPS } from '../contexts/OnboardingContext';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export const OnboardingTour: React.FC = () => {
  const { isOpen, currentStep, totalSteps, step, next, prev, skip, finish } = useOnboarding();

  if (!isOpen) return null;

  const isLast  = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
        onClick={skip}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Getting started tour"
        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: 'var(--panel)',
            borderColor: 'rgba(214,255,63,0.25)',
            boxShadow: '0 0 60px rgba(214,255,63,0.08), 0 32px 64px rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 w-full" style={{ background: 'var(--surface-3)' }}>
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: 'var(--accent)' }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border"
                style={{ background: 'rgba(214,255,63,0.1)', borderColor: 'rgba(214,255,63,0.3)' }}
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              </div>
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider"
                style={{ color: 'var(--accent)' }}
              >
                Getting Started
              </span>
            </div>
            <button
              onClick={skip}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              style={{ color: 'var(--text-5)' }}
              aria-label="Skip tour"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step content */}
          <div className="px-6 pb-4 space-y-3">
            <div className="text-4xl">{step.emoji}</div>
            <h2
              className="text-lg font-extrabold leading-tight"
              style={{ color: 'var(--text-1)' }}
            >
              {step.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>
              {step.description}
            </p>

            {/* Step hint pill */}
            {step.tab && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border"
                style={{
                  background: 'rgba(214,255,63,0.07)',
                  borderColor: 'rgba(214,255,63,0.2)',
                  color: 'var(--accent)',
                }}
              >
                <span>→ Navigate to</span>
                <span className="capitalize font-bold">{step.tab}</span>
                <span>tab</span>
              </div>
            )}
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 px-6 pb-3">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width:  i === currentStep ? '20px' : '6px',
                  height: '6px',
                  background: i === currentStep ? 'var(--accent)' : 'var(--surface-5)',
                }}
              />
            ))}
          </div>

          {/* Footer buttons */}
          <div
            className="flex items-center justify-between px-6 py-4 border-t"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              onClick={skip}
              className="text-xs font-semibold transition-colors cursor-pointer"
              style={{ color: 'var(--text-5)' }}
            >
              Skip Tour
            </button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                  style={{
                    background: 'var(--bg)',
                    borderColor: 'var(--border-2)',
                    color: 'var(--text-2)',
                  }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={isLast ? finish : next}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: 'var(--accent)',
                  color: '#000',
                  boxShadow: '0 0 16px rgba(214,255,63,0.3)',
                }}
              >
                {isLast ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Get Started!
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
