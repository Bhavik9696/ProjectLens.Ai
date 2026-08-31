import mongoose from 'mongoose';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

/**
 * Connect to MongoDB with retry logic.
 * Retries up to MAX_RETRIES times before giving up.
 * Uses generous timeouts so MongoDB Atlas has time to wake up
 * after auto-pausing on the free tier.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/projectlens_ai';

  mongoose.set('strictQuery', true);

  const options = {
    serverSelectionTimeoutMS: 12000, // wait up to 12s for Atlas to respond
    connectTimeoutMS: 12000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, options);
      console.log(`[MongoDB] Connected → ${mongoose.connection.name}`);

      // Reconnect on disconnect (e.g. Atlas auto-pause)
      mongoose.connection.on('disconnected', () => {
        console.warn('[MongoDB] Disconnected — Mongoose will auto-reconnect');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[MongoDB] Reconnected ✓');
      });

      mongoose.connection.on('error', (err) => {
        console.error('[MongoDB] Connection error:', err.message);
      });

      return; // success — exit loop
    } catch (err) {
      console.error(`[MongoDB] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt === MAX_RETRIES) {
        console.error('[MongoDB] All retries exhausted. Check your MONGODB_URI in server/.env');
        console.error('[MongoDB] If using MongoDB Atlas free tier, make sure the cluster is not paused:');
        console.error('[MongoDB]   → https://cloud.mongodb.com → Resume Cluster');
        process.exit(1);
      }

      console.log(`[MongoDB] Retrying in ${RETRY_DELAY_MS / 1000}s…`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

export default connectDB;
