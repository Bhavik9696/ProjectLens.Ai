import dotenv from 'dotenv';
import Project from '../models/Project.js';
import { connectDB } from './db.js';

dotenv.config();

export async function seedIfEmpty() {
  // Projects are now user-scoped (each project has a userId).
  // There is no longer a meaningful global "demo project" to seed,
  // so this is intentionally a no-op. Users start with 2 free project
  // credits and create their own projects after sign-up.
  return;
}

// Allow running directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  connectDB()
    .then(seedIfEmpty)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
