import crypto from 'crypto';
import { Router } from 'express';
import ApiKey from '../models/ApiKey.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All API key management routes require a logged-in user (JWT)
router.use(requireAuth);

/* ------------------------------------------------------------------ */
/* GET /api/keys — list user's API keys (prefix + label, never hash)  */
/* ------------------------------------------------------------------ */
router.get('/', async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user._id })
      .select('keyPrefix label lastUsedAt createdAt')
      .sort({ createdAt: -1 });

    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/keys — generate a new API key                             */
/* Full key is returned ONCE and NEVER stored in plain text.           */
/* ------------------------------------------------------------------ */
router.post('/', async (req, res) => {
  try {
    const { label = 'My API Key' } = req.body;

    // Enforce max 10 keys per user
    const count = await ApiKey.countDocuments({ userId: req.user._id });
    if (count >= 10) {
      return res.status(400).json({ error: 'Maximum of 10 API keys per account. Revoke an existing key to create a new one.' });
    }

    // Generate a cryptographically secure random key
    const rawKey  = `pl_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 16); // pl_live_ + 8 chars

    await ApiKey.create({
      userId:    req.user._id,
      keyHash,
      keyPrefix,
      label:     label.trim().slice(0, 80),
    });

    // Return the FULL key only on creation — never again
    res.status(201).json({
      key:    rawKey,
      prefix: keyPrefix,
      label,
      message: 'Copy this key now — it will not be shown again.',
    });
  } catch (err) {
    console.error('[ApiKeys] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/* ------------------------------------------------------------------ */
/* DELETE /api/keys/:id — revoke a key by its MongoDB _id             */
/* ------------------------------------------------------------------ */
router.delete('/:id', async (req, res) => {
  try {
    const key = await ApiKey.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }
    res.json({ success: true, message: 'API key revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

export default router;
