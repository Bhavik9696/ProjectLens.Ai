import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { connectDB } from './config/db.js';
import { seedIfEmpty } from './config/seed.js';
import authRoutes from './routes/auth.js';
import copilotRoutes from './routes/copilot.js';
import documentsRoutes from './routes/documents.js';
import engineRoutes from './routes/engine.js';
import githubRoutes from './routes/github.js';
import projectsRoutes from './routes/projects.js';
import paymentsRoutes from './routes/payments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  // CLIENT_ORIGIN: comma-separated list for local/CI overrides
  ...(process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim()),
  // CLIENT_URL: single production frontend URL set in Render/Vercel env vars
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL.trim()] : []),
  'http://localhost:5174',  // Vite fallback port when 5173 is taken
  'http://localhost:5175',  // extra fallback
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Root health check (used by Render, uptime monitors, etc.)
app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'ProjectLens AI backend is running' });
});

// Health check (legacy path kept for compatibility)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication (signup / signin / me)
app.use('/api/auth', authRoutes);

// Step 1 & persistence: project CRUD backed by MongoDB
app.use('/api/projects', projectsRoutes);

// Step 2 & 3: document upload -> section + requirement extraction
app.use('/api/documents', documentsRoutes);

// Step 4 & 5: GitHub repository analyzer
app.use('/api/github', githubRoutes);

// Step 6-10: requirement analysis engine & health score calculator
app.use('/api/engine', engineRoutes);

// Step 11 & 12: Gemini AI RAG copilot
app.use('/api/copilot', copilotRoutes);

// Payments & credits (Razorpay Test Mode)
app.use('/api/payments', paymentsRoutes);

// 404 fallback for unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

async function start() {
  await connectDB();
  await seedIfEmpty();

  app.listen(PORT, () => {
    console.log(`[ProjectLens AI] API server running on http://localhost:${PORT}`);
  });
}

start();
