const express = require('express');
const { createEvaluationRoutes } = require('./evaluation.routes');

const createV2Routes = () => {
  const router = express.Router();

  // Apply sub-routes
  router.use('/evaluation', createEvaluationRoutes());

  // V2 root endpoint
  router.get('/', (req, res) => {
    res.json({
      version: 'v2',
      description: 'Enhanced API with job-fit awareness',
      endpoints: {
        evaluation: {
          evaluate: 'POST /v2/evaluation/evaluate',
          evaluateWithJobFit: 'POST /v2/evaluation/evaluate-with-job-fit'
        }
      }
    });
  });

  return router;
};

module.exports = { createV2Routes };
