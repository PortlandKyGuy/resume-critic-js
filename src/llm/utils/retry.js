const { curry } = require('ramda');

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

  return curry(async (fn, ...args) => {
    let lastError;

    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;

        // Check if error is retryable
        if (!isRetryable(error)) {
          throw error;
        }

        // If this is the last attempt, throw the error
        if (attempt === config.maxRetries - 1) {
          throw error;
        }

        // Calculate delay
        const delay = calculateDelay(attempt, config);

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
    return true;
  }

  // Check for retryable HTTP status codes
  if (error.response?.status && RETRYABLE_STATUS_CODES.includes(error.response.status)) {
    return true;
  }

  // Check for specific error messages
  if (error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('network')
        || message.includes('timeout')
        || message.includes('rate limit')) {
      return true;
    }
  }

  // Don't retry by default
  return false;
};

/**
 * Calculate delay for next retry
 * @param {number} attempt - Current attempt number (0-based)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
const calculateDelay = (attempt, config) => {
  let delay;

  switch (config.backoff) {
    case 'exponential':
      delay = config.initialDelay * config.factor ** attempt;
      break;
    case 'linear':
      delay = config.initialDelay * (attempt + 1);
      break;
    case 'constant':
      delay = config.initialDelay;
      break;
    default:
      delay = config.initialDelay;
  }

  // Apply max delay cap
  delay = Math.min(delay, config.maxDelay);

  // Add jitter if enabled
  if (config.jitter) {
    const jitterAmount = delay * 0.2; // 20% jitter
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }

  return Math.max(0, Math.round(delay));
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
