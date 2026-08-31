import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      maxlength: [80, 'Name must be 80 characters or fewer'],
    },
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    // password is optional for OAuth users
    password: {
      type:      String,
      minlength: [6, 'Password must be at least 6 characters'],
    },

    // ── OAuth ───────────────────────────────────────────────────────────
    // 'local' = email + password, 'google' = Google OAuth
    authProvider: {
      type:    String,
      enum:    ['local', 'google'],
      default: 'local',
    },
    // Google OAuth subject ID — sparse so null values don't conflict on unique index
    googleId: {
      type:   String,
      sparse: true,
      unique: true,
    },

    // ── Credit / Freemium System ────────────────────────────────────────
    // Each new user starts with 2 free project slots.
    // These are consumed BEFORE paid credits when a project is created.
    freeProjectsRemaining: {
      type:    Number,
      default: 2,
      min:     0,
    },
    // Paid credits purchased via Razorpay (1 credit = 1 project).
    paidCredits: {
      type:    Number,
      default: 0,
      min:     0,
    },
  },
  { timestamps: true }
);

// Hash password before saving (only for local auth users)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain-text password against the stored hash
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false; // OAuth users have no password
  return bcrypt.compare(candidate, this.password);
};

// Never expose the password hash in JSON responses; always include credit counters
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
