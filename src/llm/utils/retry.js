const { curry } = require('ramda');
const { logger } = require('../../utils/logger');

/**
 * Error types that should be retried
 */
const RETRYABLE_ERROR_CODES = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'ESOCKETTIMEDOUT',
  'ECONNREFUSED'
];

/**
 * HTTP status codes that should be retried
 */
const RETRYABLE_STATUS_CODES = [
  429, // Too Many Requests
  500, // Internal Server Error
  502, // Bad Gateway
  503, // Service Unavailable
  504 // Gateway Timeout
];

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Sleep promise
 */
const sleep = ms => new Promise(resolve => {
  setTimeout(resolve, ms);
});

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error should be retried
 */
const isRetryable = error => {
  // Check for retryable error codes
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code)) {
    logger.debug('Retry: Error code is retryable', {
      errorCode: error.code,
      retryableErrorCodes: RETRYABLE_ERROR_CODES
    });
    return true;
  }

  // Check for retryable HTTP status codes
  if (error.response?.status && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    logger.debug('Retry: HTTP status code is retryable', {
      statusCode: error.response.status,
      retryableStatusCodes: RETRYABLE_STATUS_CODES
    });
    return true;
  }

  // Check for specific error messages
  if (error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('network')
        || message.includes('timeout')
        || message.includes('rate limit')) {
      logger.debug('Retry: Error message indicates retryable condition', {
        errorMessage: error.message,
        matchedKeywords: ['network', 'timeout', 'rate limit'].filter(keyword => message.includes(keyword))
      });
      return true;
    }
  }

  // Check for custom isRetryable property (from LLMProviderError)
  if (typeof error.isRetryable === 'function' && error.isRetryable()) {
    logger.debug('Retry: Error has custom isRetryable method returning true');
    return true;
  }

  // Don't retry by default
  logger.debug('Retry: Error is not retryable', {
    errorType: error.constructor.name,
    errorMessage: error.message,
    hasCode: !!error.code,
    hasResponse: !!error.response
  });
  return false;
};

/**
 * Calculate delay for next retry
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
const calculateDelay = (attempt, config) => {
  const attemptNumber = attempt + 1;

  // Calculate base delay based on backoff strategy
  const exponentialDelay = config.initialDelay * (config.factor ** attempt);
  const linearDelay = config.initialDelay * attemptNumber;
  const constantDelay = config.initialDelay;

  const baseDelay = (() => {
    if (config.backoff === 'exponential') return exponentialDelay;
    if (config.backoff === 'linear') return linearDelay;
    if (config.backoff === 'constant') return constantDelay;
    return config.initialDelay;
  })();

  // Apply max delay cap
  const cappedDelay = Math.min(baseDelay, config.maxDelay);

  // Add jitter if enabled
  const jitterAmount = config.jitter ? cappedDelay * 0.2 : 0; // 20% jitter
  const jitterValue = config.jitter ? (Math.random() - 0.5) * 2 * jitterAmount : 0;
  const finalDelay = cappedDelay + jitterValue;

  if (config.jitter) {
    logger.debug('Retry: Applied jitter to delay', {
      baseDelay: cappedDelay,
      jitterAmount,
      jitterValue: Math.round(jitterValue),
      finalDelay: Math.round(finalDelay)
    });
  }

  const calculatedDelay = Math.max(0, Math.round(finalDelay));

  logger.debug('Retry: Calculated retry delay', {
    attempt: attemptNumber,
    backoffStrategy: config.backoff,
    baseDelay: Math.round(baseDelay),
    wasCapped: baseDelay > config.maxDelay,
    maxDelay: config.maxDelay,
    jitterEnabled: config.jitter,
    finalDelay: calculatedDelay
  });

  return calculatedDelay;
};

/**
 * Create retry wrapper for async functions
 * @param {Object} options - Retry options
 * @returns {Function} Retry wrapper function
 */
const createRetry = (options = {}) => {
  const config = {
    maxRetries: options.maxRetries || 3,
    backoff: options.backoff || 'exponential',
    initialDelay: options.initialDelay || 1000,
    maxDelay: options.maxDelay || 60000,
    factor: options.factor || 2,
    jitter: options.jitter !== false,
    onRetry: options.onRetry || (() => {})
  };

  logger.debug('Retry: Creating retry wrapper', {
    maxRetries: config.maxRetries,
    backoff: config.backoff,
    initialDelay: config.initialDelay,
    maxDelay: config.maxDelay,
    factor: config.factor,
    jitter: config.jitter
  });

  return curry(async (fn, ...args) => {
    const startTime = Date.now();
    const functionName = fn.name || 'anonymous';

    logger.debug('Retry: Starting retryable function execution', {
      functionName,
      maxRetries: config.maxRetries
    });

    const executeWithRetry = async attemptNumber => {
      const attemptStartTime = Date.now();

      try {
        logger.debug('Retry: Attempting function call', {
          functionName,
          attempt: attemptNumber + 1,
          maxRetries: config.maxRetries
        });

        const result = await fn(...args);

        const totalDuration = Date.now() - startTime;
        logger.info('Retry: Function succeeded', {
          functionName,
          attempt: attemptNumber + 1,
          totalDuration,
          retriesNeeded: attemptNumber
        });

        return result;
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;

        // Check if error is retryable
        const retryable = isRetryable(error);

        logger.debug('Retry: Function failed', {
          functionName,
          attempt: attemptNumber + 1,
          attemptDuration,
          errorMessage: error.message,
          errorCode: error.code,
          statusCode: error.response?.status,
          retryable
        });

        if (!retryable) {
          logger.warn('Retry: Error is not retryable', {
            functionName,
            errorMessage: error.message,
            errorCode: error.code
          });
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attemptNumber === config.maxRetries - 1) {
          const totalDuration = Date.now() - startTime;
          logger.error('Retry: Max retries exhausted', {
            functionName,
            maxRetries: config.maxRetries,
            totalDuration,
            finalError: error.message
          });
          throw error;
        }

        // Calculate delay
        const delay = calculateDelay(attemptNumber, config);

        logger.info('Retry: Will retry after delay', {
          functionName,
          attempt: attemptNumber + 1,
          nextAttempt: attemptNumber + 2,
          delay,
          backoffStrategy: config.backoff
        });

        // Call onRetry callback
        config.onRetry({
          error,
          attempt: attemptNumber + 1,
          delay,
          willRetry: true
        });

        // Wait before retrying
        await sleep(delay);

        // Recursive call for next attempt
        return executeWithRetry(attemptNumber + 1);
      }
    };

    return executeWithRetry(0);
  });
};

/**
 * Wrap a function with retry logic
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Retry options
 * @returns {Function} Wrapped function
 */
const withRetry = curry((options, fn) => {
  logger.debug('Retry: Wrapping function with retry logic', {
    functionName: fn.name || 'anonymous',
    hasOptions: !!options
  });

  const retry = createRetry(options);
  return async (...args) => retry(fn, ...args);
});

/**
 * Create a retryable version of axios or similar HTTP client
 * @param {Object} client - HTTP client instance
 * @param {Object} options - Retry options
 * @returns {Object} Wrapped client
 */
const createRetryableClient = (client, options = {}) => {
  logger.debug('Retry: Creating retryable HTTP client', {
    clientType: client.constructor.name,
    hasOptions: !!options
  });

  const retry = createRetry(options);

  return {
    ...client,
    request: async (...args) => retry(client.request.bind(client), ...args),
    get: async (...args) => retry(client.get.bind(client), ...args),
    post: async (...args) => retry(client.post.bind(client), ...args),
    put: async (...args) => retry(client.put.bind(client), ...args),
    delete: async (...args) => retry(client.delete.bind(client), ...args)
  };
};

module.exports = {
  createRetry,
  withRetry,
  isRetryable,
  calculateDelay,
  createRetryableClient,
  RETRYABLE_ERROR_CODES,
  RETRYABLE_STATUS_CODES
};
