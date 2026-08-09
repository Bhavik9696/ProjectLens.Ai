import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/projectlens_ai';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    console.log(`[MongoDB] Connected -> ${mongoose.connection.name}`);
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message);
    console.error(
      '[MongoDB] Make sure MongoDB is running and MONGODB_URI is set correctly in server/.env'
    );
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected');
  });
}

export default connectDB;
