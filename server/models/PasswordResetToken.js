import mongoose from 'mongoose';

/**
 * Stores a hashed version of the password-reset token.
 * The raw token is only ever sent in the email link — never stored here.
 * MongoDB will auto-delete documents once expiresAt passes (TTL index).
 */
const passwordResetTokenSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  // SHA-256 hash of the raw URL token — safe to store
  tokenHash: {
    type:     String,
    required: true,
    unique:   true,
  },
  expiresAt: {
    type:    Date,
    required: true,
    // TTL index: MongoDB automatically removes the document after this date
    index: { expires: 0 },
  },
}, { timestamps: false });

export default mongoose.model('PasswordResetToken', passwordResetTokenSchema);
