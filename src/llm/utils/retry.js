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
    let lastError;
    const startTime = Date.now();
    const functionName = fn.name || 'anonymous';

    logger.debug('Retry: Starting retryable function execution', {
      functionName,
      maxRetries: config.maxRetries
    });

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      const attemptStartTime = Date.now();
      
      try {
        logger.debug('Retry: Attempting function call', {
          functionName,
          attempt: attempt + 1,
          maxRetries: config.maxRetries
        });
        
        const result = await fn(...args);
        
        const totalDuration = Date.now() - startTime;
        logger.info('Retry: Function succeeded', {
          functionName,
          attempt: attempt + 1,
          totalDuration,
          retriesNeeded: attempt
        });
        
        return result;
      } catch (error) {
        lastError = error;
        const attemptDuration = Date.now() - attemptStartTime;

        // Check if error is retryable
        const retryable = isRetryable(error);
        
        logger.debug('Retry: Function failed', {
          functionName,
          attempt: attempt + 1,
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
        if (attempt === config.maxRetries - 1) {
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
        const delay = calculateDelay(attempt, config);

        logger.info('Retry: Will retry after delay', {
          functionName,
          attempt: attempt + 1,
          nextAttempt: attempt + 2,
          delay,
          backoffStrategy: config.backoff
        });

        // Call onRetry callback
        config.onRetry({
          error,
          attempt: attempt + 1,
          delay,
          willRetry: true
        });

        // Wait before retrying
        await sleep(delay);
      }
    }

    throw lastError;
  });
};

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
        matchedKeywords: ['network', 'timeout', 'rate limit'].filter(keyword => 
          message.includes(keyword)
        )
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
  let baseDelay;
  const attemptNumber = attempt + 1;

  switch (config.backoff) {
    case 'exponential':
      baseDelay = config.initialDelay * config.factor ** attempt;
      break;
    case 'linear':
      baseDelay = config.initialDelay * attemptNumber;
      break;
    case 'constant':
      baseDelay = config.initialDelay;
      break;
    default:
      baseDelay = config.initialDelay;
  }

  // Apply max delay cap
  const cappedDelay = Math.min(baseDelay, config.maxDelay);

  // Add jitter if enabled
  let finalDelay = cappedDelay;
  if (config.jitter) {
    const jitterAmount = cappedDelay * 0.2; // 20% jitter
    const jitterValue = (Math.random() - 0.5) * 2 * jitterAmount;
    finalDelay = cappedDelay + jitterValue;
    
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
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Sleep promise
 */
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
