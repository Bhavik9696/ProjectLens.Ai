/**
 * /api/payments
 *
 * Razorpay TEST-MODE integration for ProjectLens AI credit purchases.
 *
 * ── SIMULATION MODE ────────────────────────────────────────────────────────
 * When RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are the placeholder defaults
 * (or not set), the server automatically enters SIMULATION MODE:
 *   • /create-order returns a fake order object (no Razorpay API call)
 *   • /verify accepts any signature and credits the user immediately
 *
 * To enable real Razorpay Test Mode, set valid keys in server/.env:
 *   RAZORPAY_KEY_ID=rzp_test_...
 *   RAZORPAY_KEY_SECRET=...
 * ───────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import { createRequire } from 'module';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

// ── Credit pack catalogue ─────────────────────────────────────────────────
const CREDIT_PACKS = {
  pack_5:  { credits: 5,  amountPaise: 12900, label: '5 Project Credits'  },
  pack_10: { credits: 10, amountPaise: 24900, label: '10 Project Credits' },
  pack_25: { credits: 25, amountPaise: 54900, label: '25 Project Credits' },
  pack_50: { credits: 50, amountPaise: 99900, label: '50 Project Credits' },
};

// ── Detect whether we have real Razorpay credentials ─────────────────────
const RAZORPAY_KEY_ID     = (process.env.RAZORPAY_KEY_ID     || '').trim();
const RAZORPAY_KEY_SECRET = (process.env.RAZORPAY_KEY_SECRET || '').trim();

const PLACEHOLDER_FRAGMENTS = [
  'YOUR_KEY_ID_HERE', 'YOUR_KEY_SECRET_HERE', 'placeholder', 'rzp_test_placeholder',
];

const isPlaceholder = (val) =>
  !val || PLACEHOLDER_FRAGMENTS.some((f) => val.toLowerCase().includes(f.toLowerCase()));

const SIMULATION_MODE =
  isPlaceholder(RAZORPAY_KEY_ID) || isPlaceholder(RAZORPAY_KEY_SECRET);

// ── Extract a human-readable message from any kind of error/exception ─────
function getRazorpayErrorMessage(err) {
  if (!err) return 'Unknown error';
  // Razorpay SDK throws plain objects like { statusCode, error: { description } }
  if (err.error && err.error.description) return err.error.description;
  if (err.error && typeof err.error === 'string') return err.error;
  if (err.description)  return err.description;
  if (err.message)      return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// ── Initialise Razorpay using createRequire (avoids top-level await issues) ─
let razorpay = null;
if (!SIMULATION_MODE) {
  try {
    const require = createRequire(import.meta.url);
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
      key_id:     RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
    console.log('[Payments] Razorpay initialised in LIVE TEST mode ✓');
  } catch (e) {
    console.error('[Payments] Failed to initialise Razorpay:', e.message || e);
  }
} else {
  console.log('[Payments] No valid Razorpay keys — SIMULATION mode active (no real charges)');
}

/* ------------------------------------------------------------------ */
/* GET /api/payments/mode                                              */
/* ------------------------------------------------------------------ */
router.get('/mode', (_req, res) => {
  res.json({ mode: SIMULATION_MODE ? 'simulation' : 'live' });
});

/* ------------------------------------------------------------------ */
/* GET /api/payments/credits                                           */
/* ------------------------------------------------------------------ */
router.get('/credits', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('freeProjectsRemaining paidCredits');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      freeProjectsRemaining: user.freeProjectsRemaining,
      paidCredits:           user.paidCredits,
    });
  } catch (err) {
    console.error('[Payments] /credits error:', getRazorpayErrorMessage(err));
    res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/payments/create-order                                     */
/* ------------------------------------------------------------------ */
router.post('/create-order', requireAuth, async (req, res) => {
  try {
    const { packId } = req.body;
    const pack = CREDIT_PACKS[packId];

    if (!pack) {
      return res.status(400).json({ error: 'Invalid credit pack selected' });
    }

    // ── Simulation mode ────────────────────────────────────────────
    if (SIMULATION_MODE || !razorpay) {
      const fakeOrderId = `sim_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      return res.json({
        orderId:    fakeOrderId,
        amount:     pack.amountPaise,
        currency:   'INR',
        keyId:      'SIMULATION',
        packId,
        credits:    pack.credits,
        label:      pack.label,
        simulation: true,
      });
    }

    // ── Live Razorpay order ────────────────────────────────────────
    const order = await razorpay.orders.create({
      amount:   pack.amountPaise,
      currency: 'INR',
      receipt:  `plens-${String(req.user._id).slice(-8)}-${Date.now()}`,
      notes: {
        userId:  String(req.user._id),
        packId,
        credits: String(pack.credits),
      },
    });

    console.log(`[Payments] Order created: ${order.id} for ${pack.label}`);

    res.json({
      orderId:    order.id,
      amount:     pack.amountPaise,
      currency:   'INR',
      keyId:      RAZORPAY_KEY_ID,
      packId,
      credits:    pack.credits,
      label:      pack.label,
      simulation: false,
    });
  } catch (err) {
    const msg = getRazorpayErrorMessage(err);
    console.error('[Payments] /create-order error:', msg, err);
    res.status(500).json({ error: `Payment order failed: ${msg}` });
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/payments/verify                                           */
/* ------------------------------------------------------------------ */
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      packId,
      simulation,
    } = req.body;

    const pack = CREDIT_PACKS[packId];
    if (!pack) return res.status(400).json({ error: 'Invalid credit pack' });

    // ── Simulation mode: skip signature check ──────────────────────
    if (SIMULATION_MODE || simulation) {
      if (!razorpay_order_id) {
        return res.status(400).json({ error: 'Missing order ID' });
      }
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { paidCredits: pack.credits } },
        { new: true }
      );
      if (!updatedUser) return res.status(404).json({ error: 'User not found' });

      console.log(`[Payments][SIM] User ${req.user._id} received ${pack.credits} simulated credits`);

      return res.json({
        success:               true,
        creditsAdded:          pack.credits,
        freeProjectsRemaining: updatedUser.freeProjectsRemaining,
        paidCredits:           updatedUser.paidCredits,
        simulation:            true,
      });
    }

    // ── Live: HMAC-SHA256 signature verification ───────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification parameters' });
    }

    const payload  = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(payload)
      .digest('hex');

    if (expected !== razorpay_signature) {
      console.warn(`[Payments] Signature mismatch for user ${req.user._id}`);
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { paidCredits: pack.credits } },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    console.log(`[Payments] User ${req.user._id} purchased ${pack.credits} credits (${pack.label})`);

    res.json({
      success:               true,
      creditsAdded:          pack.credits,
      freeProjectsRemaining: updatedUser.freeProjectsRemaining,
      paidCredits:           updatedUser.paidCredits,
      simulation:            false,
    });
  } catch (err) {
    const msg = getRazorpayErrorMessage(err);
    console.error('[Payments] /verify error:', msg, err);
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
  }
});

export default router;
