const { logger } = require('../../utils/logger');

/**
 * Middleware to log response data when debug logging is enabled
 * @returns {Function} Express middleware
 */
const responseLogger = () => (req, res, next) => {
  // Log incoming request in debug mode
  if (logger.level === 'debug' || process.env.LOG_LEVEL === 'debug') {
    logger.debug('API Request received', {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params
    });
  }

  // Store the original json method
  const originalJson = res.json;

  // Override the json method
  res.json = function (data) {
    // Log the response if debug level is enabled
    if (logger.level === 'debug' || process.env.LOG_LEVEL === 'debug') {
      logger.debug('API Response', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseSize: JSON.stringify(data).length,
        // Log full response in debug mode
        responseData: data
      });
    } else {
      // In non-debug mode, just log basic info
      logger.info('API Response sent', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseSize: JSON.stringify(data).length
      });
    }

    // Call the original json method
    return originalJson.call(this, data);
  };

  next();
};

module.exports = { responseLogger };
