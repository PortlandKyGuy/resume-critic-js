const express = require('express');
const packageJson = require('../../../package.json');

const createHealthRoutes = () => {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: packageJson,
      environment: process.env.NODE_ENV || 'NOT_SET'
    });
  });

  // TODO: Add more ready checks. Things like database or other external connections.
  router.get('/ready', async (req, res) => {
    const checks = {
      config: true,
      timestamp: new Date().toISOString()
    };

    const allHealthy = Object.values(checks).every(check => check);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not ready',
      checks
    });
  });

  return router;
};

module.exports = { createHealthRoutes };
