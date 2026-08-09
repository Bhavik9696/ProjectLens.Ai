import { Router } from 'express';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';

const router = Router();

/* ------------------------------------------------------------------ */
/* POST /api/auth/signup                                               */
/* ------------------------------------------------------------------ */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic field validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Duplicate email check
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

export default router;
