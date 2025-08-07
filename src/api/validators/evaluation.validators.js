const { body } = require('express-validator');
const { validate } = require('../middleware/validation.middleware');

const createEvaluationValidator = () => validate([
  body('job_description')
    .notEmpty()
    .withMessage('Job description is required')
    .isString()
    .withMessage('Job description must be a string')
    .isLength({ min: 100 })
    .withMessage('Job description must be at least 100 characters'),

  body('resume')
    .notEmpty()
    .withMessage('Resume is required')
    .isString()
    .withMessage('Resume must be a string')
    .isLength({ min: 100 })
    .withMessage('Resume must be at least 100 characters'),

  body('required_terms')
    .optional()
    .isString()
    .withMessage('Required terms must be a string'),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),

  body('process_markdown')
    .optional()
    .isBoolean()
    .withMessage('Process markdown must be a boolean')
    .default(true),

  body('max_workders')
    .optional()
    .default(6)
    .isInt({ min: 1, max: 10 })
    .withMessage('Maximum number of parallel critic workers (1-10)'),

  body('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string')
    .isIn(['general', 'software-engineering'])
    .withMessage('Invalid industry'),

  body('job_fit_score')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Job fit score must be between 0 and 1')
]);

const createComparisonValidator = () => validate([
  body('job_description')
    .notEmpty()
    .withMessage('Job description is required')
    .isString()
    .withMessage('Job description must be a string'),

  body('resumes')
    .notEmpty()
    .withMessage('Resumes are required')
    .isArray({ min: 2, max: 10 })
    .withMessage('Must provide between 2 and 10 resumes'),

  body('resumes.*.content')
    .notEmpty()
    .withMessage('Resume content is required')
    .isString()
    .withMessage('Resume content must be a string'),

  body('resumes.*.identifier')
    .notEmpty()
    .withMessage('Resume identifier is required')
    .isString()
    .withMessage('Resume identifier must be a string')
]);

const createCoverLetterValidator = () => validate([
  body('job_description')
    .notEmpty()
    .withMessage('Job description is required')
    .isString()
    .withMessage('Job description must be a string')
    .isLength({ min: 100 })
    .withMessage('Job description must be at least 100 characters'),

  body('original_resume')
    .notEmpty()
    .withMessage('Original resume is required')
    .isString()
    .withMessage('Original resume must be a string')
    .isLength({ min: 100 })
    .withMessage('Original resume must be at least 100 characters'),

  body('cover_letter')
    .notEmpty()
    .withMessage('Cover letter is required')
    .isString()
    .withMessage('Cover letter must be a string')
    .isLength({ min: 50 })
    .withMessage('Cover letter must be at least 50 characters'),

  body('provider')
    .optional()
    .isString()
    .withMessage('Provider must be a string')
    .isIn(['openai', 'gemini', 'ollama', 'mock'])
    .withMessage('Invalid provider'),

  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2')
]);

const createJobFitValidator = () => validate([
  body('job_description')
    .notEmpty()
    .withMessage('Job description is required')
    .isString()
    .withMessage('Job description must be a string')
    .isLength({ min: 100 })
    .withMessage('Job description must be at least 100 characters'),

  body('resume')
    .notEmpty()
    .withMessage('Resume is required')
    .isString()
    .withMessage('Resume must be a string')
    .isLength({ min: 100 })
    .withMessage('Resume must be at least 100 characters'),

  body('original_resume')
    .optional()
    .isString()
    .withMessage('Original resume must be a string')
    .isLength({ min: 100 })
    .withMessage('Original resume must be at least 100 characters'),

  body('provider')
    .optional()
    .isString()
    .withMessage('Provider must be a string')
    .isIn(['openai', 'gemini', 'ollama', 'mock'])
    .withMessage('Invalid provider'),

  body('model')
    .optional()
    .isString()
    .withMessage('Model must be a string'),

  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 2 })
    .withMessage('Temperature must be between 0 and 2'),

  body('process_markdown')
    .optional()
    .isBoolean()
    .withMessage('Process markdown must be a boolean')
    .default(true)
]);

module.exports = {
  createEvaluationValidator,
  createComparisonValidator,
  createCoverLetterValidator,
  createJobFitValidator
};
