const { logger } = require('../../utils/logger');
const { errorSerializer, AppError } = require('../../utils/errors');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const error = err instanceof AppError ? err : (() => {
    const appError = new AppError(err.message || 'An unexpected error occurred', 500, 'INTERNAL_ERROR');
    // eslint-disable-next-line fp/no-mutation
    appError.stack = err.stack;
    return appError;
  })();

  logger.error({
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  const serializedError = errorSerializer(error);

  res.status(error.statusCode).json({
    error: serializedError
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
      statusCode: 404
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
