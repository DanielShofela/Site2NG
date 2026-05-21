/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Proxy /__/auth/* to ngsite-d9cdc.firebaseapp.com/__/auth/*
  // This solves third-party cookie restrictions under custom domains like 2ngentreprises.com
  app.use('/__/auth', createProxyMiddleware({
    target: 'https://ngsite-d9cdc.firebaseapp.com',
    changeOrigin: true,
  }));

  // Simple API or health routes can go here
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', domain: '2ngentreprises.com' });
  });

  // 2. Serve Client application based on environment
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting development server wrapper with Vite...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production static build assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
