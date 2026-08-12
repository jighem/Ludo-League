import express from 'express';
import path from 'path';
import fs from 'fs';
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
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Initialize DB
  try {
    await initDatabase();
  } catch (err) {
    console.error('Database initialization warning:', err);
  }

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
    // Resolve distPath dynamically to point strictly to compiled output directory
    let distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(path.join(__dirname, 'index.html'))) {
      distPath = __dirname;
    } else if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
      distPath = path.join(process.cwd(), 'dist');
    }

    // Serve static files from distPath
    app.use(express.static(distPath, {
      index: false,
      maxAge: '1y'
    }));

    app.get('*', (req, res) => {
      // Avoid returning index.html for missing static assets to prevent MIME type mismatch errors in browser
      if (req.path.startsWith('/assets/') || /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot|json|map)$/i.test(req.path)) {
        return res.status(404).send(`Asset ${req.path} not found in ${distPath}`);
      }

      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`Application build output (${indexPath}) not found. Please run "npm run build" or "Run script -> build" in Plesk.`);
      }
    });
  }

  // Plesk Phusion Passenger & standard node port listener
  if (process.env.PORT) {
    app.listen(process.env.PORT, () => {
      console.log(`Ludo League Server listening on process.env.PORT (${process.env.PORT})`);
    });
  } else {
    app.listen(3000, '0.0.0.0', () => {
      console.log('Ludo League Server listening on http://0.0.0.0:3000');
    });
  }
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
