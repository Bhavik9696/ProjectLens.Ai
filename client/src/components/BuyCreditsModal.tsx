import React, { useState, useEffect } from 'react';
import { X, Zap, ShoppingCart, CheckCircle2, Loader2, CreditCard, Gift, FlaskConical } from 'lucide-react';
import { createPaymentOrderApi, verifyPaymentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface CreditPack {
  id: string;
  credits: number;
  price: number;
  priceLabel: string;
  popular?: boolean;
  badge?: string;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_5',  credits: 5,  price: 129,  priceLabel: '₹129',  badge: 'Starter' },
  { id: 'pack_10', credits: 10, price: 249,  priceLabel: '₹249',  popular: true, badge: 'Best Value' },
  { id: 'pack_25', credits: 25, price: 549,  priceLabel: '₹549',  badge: 'Pro' },
  { id: 'pack_50', credits: 50, price: 999,  priceLabel: '₹999',  badge: 'Enterprise' },
];

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (creditsAdded: number) => void;
}

// Dynamically load the Razorpay checkout script (only in live mode)
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, addPaidCredits, refreshCredits } = useAuth();
  const { showToast } = useToast();
  const [selectedPack, setSelectedPack]   = useState<string>('pack_10');
  const [isProcessing, setIsProcessing]   = useState(false);
  const [isSimulation, setIsSimulation]   = useState(false);

  // Ask the server which mode it's in (simulation vs live)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/payments/mode', {
      headers: { Authorization: `Bearer ${localStorage.getItem('projectlens-token') || ''}` },
    })
      .then((r) => r.json())
      .then((d) => setIsSimulation(d.mode === 'simulation'))
      .catch(() => setIsSimulation(false));
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Simulated payment (no real Razorpay call) ─────────────────────────
  const handleSimulatedPurchase = async () => {
    setIsProcessing(true);
    try {
      const orderData = await createPaymentOrderApi(selectedPack);
      // Brief artificial delay to simulate payment processing
      await new Promise((r) => setTimeout(r, 1200));

      const result = await verifyPaymentApi({
        razorpay_order_id:   orderData.orderId,
        razorpay_payment_id: `sim_pay_${Date.now()}`,
        razorpay_signature:  'simulation',
        packId:              selectedPack,
      } as any);

      if (result.success) {
        addPaidCredits(result.creditsAdded);
        await refreshCredits();
        showToast(
          `🎉 ${result.creditsAdded} project credits added to your account!`,
          'success'
        );
        onSuccess?.(result.creditsAdded);
        onClose();
      }
    } catch (err: any) {
      showToast(err.message || 'Simulation failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Live Razorpay payment ─────────────────────────────────────────────
  const handleLivePurchase = async () => {
    setIsProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast('Could not load payment gateway. Please check your connection.', 'error');
        setIsProcessing(false);
        return;
      }

      const orderData = await createPaymentOrderApi(selectedPack);

      const options: any = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'ProjectLens AI',
        description: `${orderData.label} — Test Mode`,
        order_id:    orderData.orderId,
        prefill: {
          name:  user?.name  || '',
          email: user?.email || '',
        },
        theme: { color: '#d6ff3f' },
        handler: async (response: any) => {
          try {
            const result = await verifyPaymentApi({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              packId:              selectedPack,
            });
            if (result.success) {
              addPaidCredits(result.creditsAdded);
              await refreshCredits();
              showToast(`🎉 ${result.creditsAdded} project credits added!`, 'success');
              onSuccess?.(result.creditsAdded);
              onClose();
            }
          } catch (verifyErr: any) {
            showToast(verifyErr.message || 'Payment verification failed.', 'error');
          }
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      showToast(err.message || 'Failed to initiate payment. Please try again.', 'error');
      setIsProcessing(false);
    }
  };

  const handlePurchase = isSimulation ? handleSimulatedPurchase : handleLivePurchase;
  const selected = CREDIT_PACKS.find((p) => p.id === selectedPack)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{
          background:  'var(--panel)',
          borderColor: 'var(--border)',
          boxShadow:   '0 0 60px rgba(214,255,63,0.08), 0 0 0 1px rgba(214,255,63,0.05)',
        }}
      >
        {/* Accent glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(214,255,63,0.12) 0%, transparent 70%)', filter: 'blur(30px)' }} />

        {/* Simulation mode banner */}
        {isSimulation && (
          <div className="flex items-center justify-center gap-2 py-2 text-[11px] font-bold font-mono"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', borderBottom: '1px solid rgba(251,191,36,0.2)' }}>
            <FlaskConical className="w-3.5 h-3.5" />
            SIMULATION MODE — No real money will be charged
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ background: 'rgba(214,255,63,0.1)', borderColor: 'rgba(214,255,63,0.3)' }}>
              <Zap className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-base font-extrabold" style={{ color: 'var(--text-1)' }}>Buy Project Credits</h2>
              <p className="text-xs" style={{ color: 'var(--text-4)' }}>
                1 credit = 1 project · {isSimulation ? 'Test Simulation' : 'Razorpay Test Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
            style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', color: 'var(--text-4)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current balance */}
        {user && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-3 border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border-2)' }}>
            <Gift className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
            <div className="text-xs" style={{ color: 'var(--text-3)' }}>
              Current balance:{' '}
              <span className="font-bold" style={{ color: 'var(--accent)' }}>
                {user.freeProjectsRemaining} free
              </span>
              {' + '}
              <span className="font-bold" style={{ color: 'var(--text-1)' }}>
                {user.paidCredits} paid
              </span>
              {' credits remaining'}
            </div>
          </div>
        )}

        {/* Credit pack grid */}
        <div className="px-6 pt-5 pb-2 grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => {
            const isSelected = selectedPack === pack.id;
            return (
              <button
                key={pack.id}
                onClick={() => setSelectedPack(pack.id)}
                className="relative flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer"
                style={{
                  background:  isSelected ? 'rgba(214,255,63,0.06)' : 'var(--bg)',
                  borderColor: isSelected ? 'rgba(214,255,63,0.5)'  : 'var(--border-2)',
                  boxShadow:   isSelected ? '0 0 20px rgba(214,255,63,0.08)' : 'none',
                }}
              >
                {pack.badge && (
                  <span className="absolute top-2 right-2 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase"
                    style={{
                      background: pack.popular ? 'var(--accent)' : 'rgba(214,255,63,0.1)',
                      color:      pack.popular ? '#000'          : 'var(--accent)',
                      border:     pack.popular ? 'none'          : '1px solid rgba(214,255,63,0.2)',
                    }}>
                    {pack.badge}
                  </span>
                )}

                <div className="flex items-center gap-1.5 mb-1.5">
                  {isSelected
                    ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    : <CreditCard  className="w-4 h-4" style={{ color: 'var(--text-5)' }} />
                  }
                  <span className="text-xl font-extrabold font-mono"
                    style={{ color: isSelected ? 'var(--accent)' : 'var(--text-1)' }}>
                    {pack.credits}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-4)' }}>credits</span>
                </div>

                <div className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>{pack.priceLabel}</div>
                <div className="text-[10px] font-mono" style={{ color: 'var(--text-5)' }}>
                  ₹{(pack.price / pack.credits).toFixed(1)} / credit
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected summary */}
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl border flex items-center justify-between"
          style={{ background: 'rgba(214,255,63,0.04)', borderColor: 'rgba(214,255,63,0.2)' }}>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Selected:{' '}
            <span className="font-bold" style={{ color: 'var(--accent)' }}>{selected.credits} credits</span>
          </div>
          <div className="text-base font-extrabold" style={{ color: 'var(--text-1)' }}>
            {isSimulation ? `${selected.priceLabel} (simulated)` : selected.priceLabel}
          </div>
        </div>

        {/* Action button */}
        <div className="px-6 pt-4 pb-6 flex flex-col gap-3">
          <button
            onClick={handlePurchase}
            disabled={isProcessing}
            id="buy-credits-pay-btn"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color:      '#000',
              boxShadow:  '0 0 25px -4px rgba(214,255,63,0.5)',
            }}
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : isSimulation ? (
              <><FlaskConical className="w-4 h-4" /> Simulate Payment · Get {selected.credits} Credits</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Pay {selected.priceLabel} · Get {selected.credits} Credits</>
            )}
          </button>

          <p className="text-center text-[10px]" style={{ color: 'var(--text-5)' }}>
            {isSimulation
              ? '🧪 Simulation mode — credits are added instantly for testing'
              : '🔒 Secured by Razorpay · Test Mode — no real money charged'}
          </p>
        </div>
      </div>
    </div>
  );
};
