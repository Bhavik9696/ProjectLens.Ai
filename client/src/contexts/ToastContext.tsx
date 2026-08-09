import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ElementType; accent: string; iconColor: string }> = {
  success: { icon: CheckCircle2, accent: 'border-emerald-500/30', iconColor: 'text-emerald-400' },
  error: { icon: XCircle, accent: 'border-rose-500/30', iconColor: 'text-rose-400' },
  info: { icon: Info, accent: 'border-[var(--accent)]/30', iconColor: 'text-[var(--accent)]' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[calc(100vw-2.5rem)] max-w-sm"
      >
        {toasts.map((t) => {
          const { icon: Icon, accent, iconColor } = VARIANT_STYLES[t.variant];
          return (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 rounded-xl border ${accent} bg-[var(--panel)] text-[var(--text-2)] px-4 py-3 shadow-2xl animate-[toast-in_0.2s_ease-out]`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <p className="text-[13px] leading-snug flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-[var(--text-5)] hover:text-[var(--text-2)] transition-colors shrink-0 cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
