const express = require('express');

const createHealthRoutes = () => {
  const router = express.Router();

  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  router.get('/ready', async (req, res) => {
    const checks = {
      config: true,
      timestamp: new Date().toISOString()
    };

    const allHealthy = Object.values(checks).every(check => check === true || check);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not ready',
      checks
    });
  });

  return router;
};

module.exports = { createHealthRoutes };
