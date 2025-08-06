const express = require('express');
const { createEvaluationRoutes } = require('./evaluation.routes');

const createV2Routes = () => {
  const router = express.Router();

  // Mount evaluation routes directly at v2 root
  const evaluationRoutes = createEvaluationRoutes();
  router.use('/', evaluationRoutes);

  // V2 info endpoint at /v2/info
  router.get('/info', (req, res) => {
    res.json({
      version: 'v2',
      description: 'Enhanced API with job-fit awareness',
      endpoints: {
        evaluation: {
          evaluate: 'POST /v2/evaluate'
        }
      }
    });
  });

  return router;
};

module.exports = { createV2Routes };
