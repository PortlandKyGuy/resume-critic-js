const express = require('express');
const { createEvaluationRoutes } = require('./evaluation.routes');

const createV1Routes = () => {
  const router = express.Router();

  // Apply evaluation routes directly to match OpenAPI spec
  const evaluationRouter = createEvaluationRoutes();
  router.use('/', evaluationRouter);

  return router;
};

module.exports = { createV1Routes };
