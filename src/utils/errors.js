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

class LLMProviderError extends LLMError {
  constructor(message, provider, originalError) {
    super(message, provider, originalError);
    this.code = originalError?.code || 'LLM_PROVIDER_ERROR';
    this.response = originalError?.response;
    this.isRetryable = this.checkRetryable();
  }

  checkRetryable() {
    // Check for retryable error codes
    const RETRYABLE_ERROR_CODES = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ESOCKETTIMEDOUT',
      'ECONNREFUSED'
    ];

    const RETRYABLE_STATUS_CODES = [
      429, 500, 502, 503, 504
    ];

    if (this.code && RETRYABLE_ERROR_CODES.includes(this.code)) {
      return true;
    }

    if (this.response?.status && RETRYABLE_STATUS_CODES.includes(this.response.status)) {
      return true;
    }

    if (this.message) {
      const message = this.message.toLowerCase();
      if (message.includes('network')
          || message.includes('timeout')
          || message.includes('rate limit')) {
        return true;
      }
    }

    return false;
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
  LLMProviderError,
  ConfigurationError,
  errorSerializer,
  asyncHandler
};
