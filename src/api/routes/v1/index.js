const express = require('express');
const { createEvaluationRoutes } = require('./evaluation.routes');

const createV1Routes = () => {
  const router = express.Router();

  // Apply sub-routes
  router.use('/evaluation', createEvaluationRoutes());

  // V1 root endpoint
  router.get('/', (req, res) => {
    res.json({
      version: 'v1',
      endpoints: {
        evaluation: {
          evaluate: 'POST /v1/evaluation/evaluate',
          evaluateFiles: 'POST /v1/evaluation/evaluate-files'
        }
      }
    });
  });

  return router;
};

module.exports = { createV1Routes };
