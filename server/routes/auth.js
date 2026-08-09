import crypto from 'crypto';
import { Router } from 'express';
import User from '../models/User.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = Router();

/* ------------------------------------------------------------------ */
/* POST /api/auth/signup                                               */
/* ------------------------------------------------------------------ */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await User.create({ name: name.trim(), email, password });
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[Auth] Signup error:', err.message);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    res.status(500).json({ error: 'Sign up failed. Please try again.' });
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/signin                                               */
/* ------------------------------------------------------------------ */
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[Auth] Signin error:', err.message);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/auth/me  (validates token, returns current user)          */
/* ------------------------------------------------------------------ */
router.get('/me', requireAuth, (req, res) => {
  const { _id: id, name, email } = req.user;
  res.json({ user: { id, name, email } });
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/forgot-password                                      */
/* Always returns 200 to avoid leaking which emails are registered.   */
/* ------------------------------------------------------------------ */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Silently succeed if no account — prevents email enumeration
    if (!user) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Remove any existing stale tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate a cryptographically secure raw token (sent in the email link)
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await PasswordResetToken.create({
      userId:    user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl  = `${clientUrl}?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      console.log(`[Auth] Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('[Auth] Failed to send reset email:', emailErr.message);
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('[Auth] Forgot-password error:', err.message);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/auth/reset-password                                       */
/* ------------------------------------------------------------------ */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash the incoming raw token to look it up safely
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetRecord = await PasswordResetToken.findOne({ tokenHash });
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    // Extra expiry guard (TTL index handles cleanup, but enforce here too)
    if (resetRecord.expiresAt < new Date()) {
      await resetRecord.deleteOne();
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const user = await User.findById(resetRecord.userId);
    if (!user) {
      return res.status(400).json({ error: 'Account not found.' });
    }

    // Pre-save hook will bcrypt-hash the new password automatically
    user.password = newPassword;
    await user.save();

    // Single-use: invalidate immediately after use
    await resetRecord.deleteOne();

    console.log(`[Auth] Password reset successfully for ${user.email}`);
    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('[Auth] Reset-password error:', err.message);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

export default router;
