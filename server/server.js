import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { connectDB } from './config/db.js';
import { seedIfEmpty } from './config/seed.js';
import copilotRoutes from './routes/copilot.js';
import documentsRoutes from './routes/documents.js';
import engineRoutes from './routes/engine.js';
import githubRoutes from './routes/github.js';
import projectsRoutes from './routes/projects.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
