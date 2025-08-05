const express = require('express');
const { asyncHandler } = require('../../../utils/errors');
const { sanitizeRequest } = require('../../middleware/validation.middleware');
const { createEvaluationValidator } = require('../../validators/evaluation.validators');

const createEvaluationRoutes = () => {
  const router = express.Router();

  // Placeholder handlers - will be implemented later
  const createEvaluationHandler = () => asyncHandler(async (req, res) => {
    res.json({
      message: 'Evaluation endpoint - to be implemented',
      data: req.validated
    });
  });

  const createFileEvaluationHandler = () => asyncHandler(async (req, res) => {
    res.json({
      message: 'File evaluation endpoint - to be implemented',
      data: req.validated,
      files: req.files ? req.files.length : 0
    });
  });

  // Routes
  router.post(
    '/evaluate',
    createEvaluationValidator(),
    sanitizeRequest,
    createEvaluationHandler()
  );

  router.post(
    '/evaluate-files',
    // File upload middleware will be added later
    sanitizeRequest,
    createFileEvaluationHandler()
  );

  return router;
};

module.exports = { createEvaluationRoutes };
