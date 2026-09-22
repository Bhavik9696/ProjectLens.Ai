import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import analyzeRouter from './routes/analyze.js';

dotenv.config();

const app = express();
const PORT = process.env.LOCAL_AGENT_PORT || 3847;

// Only accept connections from localhost (the ProjectLens backend)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:5173', 'http://localhost:5174'].includes(origin)) {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json({ limit: '5mb' }));

// Simple shared secret so the backend can identify itself
const AGENT_SECRET = process.env.LOCAL_AGENT_SECRET || 'projectlens-local-secret';

app.use((req, res, next) => {
  // Allow health checks without auth
  if (req.path === '/health' || req.path === '/') return next();
  const provided = req.headers['x-agent-secret'];
  if (provided !== AGENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid agent secret' });
  }
  next();
});

app.get('/', (_req, res) => res.json({ name: 'ProjectLens Local Agent', version: '1.0.0', status: 'running' }));
app.use('/health', healthRouter);
app.use('/models', modelsRouter);
app.use('/analyze', analyzeRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════════════╗');
  console.log('  ║      ProjectLens Local Agent  v1.0.0           ║');
  console.log('  ╚════════════════════════════════════════════════╝');
  console.log(`  Listening on: http://127.0.0.1:${PORT}`);
  console.log(`  Ollama URL:   ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
  console.log(`  Model:        ${process.env.OLLAMA_DEFAULT_MODEL || 'llama3.1:8b'}`);
  console.log('');
  console.log('  Repository source code stays on YOUR machine.');
  console.log('  Only safe analysis results are returned to ProjectLens.');
  console.log('');
});
