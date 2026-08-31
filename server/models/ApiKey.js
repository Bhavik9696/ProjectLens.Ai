import mongoose from 'mongoose';

/**
 * ApiKey — stores hashed API keys for programmatic REST API access.
 *
 * The full key (pl_live_<random>) is shown to the user ONCE on creation
 * and is never stored in plain text. Only the SHA-256 hash is stored.
 *
 * keyPrefix is the first 12 chars of the raw key — used for display
 * so users can identify which key is which without exposing the full value.
 */
const apiKeySchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    keyHash: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    keyPrefix: {
      type:     String,
      required: true,
    },
    label: {
      type:    String,
      default: 'My API Key',
      maxlength: [80, 'Label must be 80 characters or fewer'],
    },
    lastUsedAt: {
      type:    Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('ApiKey', apiKeySchema);
