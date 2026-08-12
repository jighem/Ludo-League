import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';

import { initDatabase } from './server/db';
import authRoutes from './server/routes/authRoutes';
import userRoutes from './server/routes/userRoutes';
import playerRoutes from './server/routes/playerRoutes';
import matchRoutes from './server/routes/matchRoutes';
import statsRoutes from './server/routes/statsRoutes';
import settingsRoutes from './server/routes/settingsRoutes';
import auditRoutes from './server/routes/auditRoutes';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Initialize DB
  await initDatabase();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/audit-logs', auditRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite or static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ludo League Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
