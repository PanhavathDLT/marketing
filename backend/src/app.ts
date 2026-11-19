import 'tsconfig-paths/register';
import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import { env } from '@config/env.js';
import '@config/passport.js'; // register passport strategy
import v1Router from './routes/v1.js';
import { errorHandler } from '@shared/middleware/error.middleware.js';
import prisma from '@lib/prisma.js';

const app: Application = express();

app.use(cors());
app.use(express.json());

// Serve locally-uploaded files
if (env.STORAGE_DRIVER === 'local') {
  app.use('/uploads', express.static(path.resolve('public/uploads')));
}

// Serve DB-stored files
if (env.STORAGE_DRIVER === 'db') {
  app.get('/files/:id', async (req, res) => {
    const file = await prisma.storedFile.findUnique({ where: { id: req.params.id } });
    if (!file) {
      res.status(404).json({ status: 'error', error: 'File not found' });
      return;
    }
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    res.send(file.data);
  });
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API v1
app.use('/api/v1', v1Router);

// 404
app.use((_req, res) => {
  res.status(404).json({ status: 'error', error: 'Not found' });
});

// Global error handler
app.use(errorHandler);

export default app;
