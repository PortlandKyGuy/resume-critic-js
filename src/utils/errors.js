/* eslint-disable max-classes-per-file */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class LLMError extends AppError {
  constructor(message, provider, originalError) {
    super(message, 500, 'LLM_ERROR');
    this.provider = provider;
    this.originalError = originalError;
  }
}

class ConfigurationError extends AppError {
  constructor(message) {
    super(message, 500, 'CONFIGURATION_ERROR');
  }
}

const errorSerializer = error => ({
  code: error.code || 'UNKNOWN_ERROR',
  message: error.message,
  statusCode: error.statusCode || 500,
  ...(error.errors && { errors: error.errors }),
  ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
});

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  LLMError,
  ConfigurationError,
  errorSerializer,
  asyncHandler
};
