const { validationResult } = require('express-validator');
const { pipe, map } = require('ramda');
const { ValidationError } = require('../../utils/errors');

const validate = validations => async (req, res, next) => {
  await Promise.all(validations.map(validation => validation.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formattedErrors = pipe(
    map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }))
  )(errors.array());

  const error = new ValidationError('Validation failed', formattedErrors);
  return next(error);
};

const sanitizeRequest = (req, res, next) => {
  const sanitized = {
    ...req.body,
    ...req.query,
    ...req.params
  };

  req.validated = sanitized;
  next();
};

module.exports = {
  validate,
  sanitizeRequest
};
