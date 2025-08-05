const { body } = require('express-validator');
const { validate } = require('../middleware/validation.middleware');

const createEvaluationValidator = () => validate([
  body('job_description')
    .notEmpty()
    .withMessage('Job description is required')
    .isString()
    .withMessage('Job description must be a string')
    .isLength({ min: 10 })
    .withMessage('Job description must be at least 10 characters'),

  body('resume')
    .notEmpty()
    .withMessage('Resume is required')
    .isString()
    .withMessage('Resume must be a string')
    .isLength({ min: 10 })
    .withMessage('Resume must be at least 10 characters'),

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
    .withMessage('Process markdown must be a boolean'),

  body('industry')
    .optional()
    .isString()
    .withMessage('Industry must be a string')
    .isIn(['general', 'software-engineering', 'finance', 'healthcare', 'education'])
    .withMessage('Invalid industry')
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

module.exports = {
  createEvaluationValidator,
  createComparisonValidator
};
