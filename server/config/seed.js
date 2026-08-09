import dotenv from 'dotenv';
import Project from '../models/Project.js';
import { connectDB } from './db.js';

dotenv.config();

export async function seedIfEmpty() {
  const count = await Project.countDocuments();
  if (count > 0) return;

  const now = new Date().toISOString();
  await Project.create({
    _id: 'proj-default',
    name: 'GitHub Codebase & Document Analyzer',
    description:
      'Upload requirement document (SRS) to extract features, then connect a GitHub repository to compare implemented, partial, and missing components.',
    deadline: '2026-12-31',
    techStack: ['TypeScript', 'Node.js', 'React', 'Express', 'MongoDB'],
    githubUrl: 'https://github.com/Bhavik9696/test-repo-project.git',
    createdAt: now,
    updatedAt: now,
    documents: [],
    requirements: [],
    implementationProfile: null,
    analysisResults: [],
    healthMetrics: {
      requirementCoverage: 0,
      implementationCoverage: 0,
      sprintProgress: 0,
      githubActivity: 0,
      overallScore: 0,
      healthRating: 'Healthy',
      highRiskModules: [],
      keyRiskFactors: ['Upload an SRS or requirement document to extract requirements, then analyze GitHub repository.'],
    },
    chatMessages: [],
  });

  console.log('[Seed] Inserted default demo project (proj-default)');
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
