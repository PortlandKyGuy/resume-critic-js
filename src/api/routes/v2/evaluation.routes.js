const express = require('express');
const { asyncHandler } = require('../../../utils/errors');
const { sanitizeRequest } = require('../../middleware/validation.middleware');
const { createEvaluationValidator } = require('../../validators/evaluation.validators');

const createEvaluationRoutes = () => {
  const router = express.Router();

  // V2 enhanced evaluation with job-fit
  const createEnhancedEvaluationHandler = () => asyncHandler(async (req, res) => {
    res.json({
      message: 'V2 Enhanced evaluation endpoint - to be implemented',
      version: 'v2',
      features: ['job-fit-scoring', 'enhanced-feedback'],
      data: req.validated
    });
  });

  // Routes
  router.post(
    '/evaluate',
    createEvaluationValidator(),
    sanitizeRequest,
    createEnhancedEvaluationHandler()
  );

  router.post(
    '/evaluate-with-job-fit',
    createEvaluationValidator(),
    sanitizeRequest,
    createEnhancedEvaluationHandler()
  );

  return router;
};

module.exports = { createEvaluationRoutes };
