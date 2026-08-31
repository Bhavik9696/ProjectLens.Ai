import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ApiKey from '../models/ApiKey.js';

const JWT_SECRET = process.env.JWT_SECRET || 'projectlens-dev-secret-change-in-production';

/**
 * Express middleware that validates a Bearer JWT and attaches req.user.
 * Returns 401 if the token is missing or invalid.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware that accepts EITHER a JWT bearer token OR a ProjectLens API key.
 * Used by the public REST API (/api/v1/*) so both humans and CI pipelines work.
 *
 * API keys look like: pl_live_<64 hex chars>
 * JWT tokens look like: eyJ...
 */
export async function requireApiKeyOrJwt(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Use Bearer <jwt> or Bearer pl_live_<apikey>' });
    }

    const token = header.slice(7);

    // API key path
    if (token.startsWith('pl_live_')) {
      const keyHash = crypto.createHash('sha256').update(token).digest('hex');
      const apiKey = await ApiKey.findOne({ keyHash });

      if (!apiKey) {
        return res.status(401).json({ error: 'Invalid or revoked API key' });
      }

      const user = await User.findById(apiKey.userId).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'API key owner not found' });
      }

      // Update lastUsedAt asynchronously — don't block the request
      ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).catch(() => {});

      req.user = user;
      req.apiKeyId = apiKey._id;
      return next();
    }

    // JWT path (same as requireAuth)
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Sign a JWT for a given user id. Expires in 7 days.
 */
export function signToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '7d' });
}
