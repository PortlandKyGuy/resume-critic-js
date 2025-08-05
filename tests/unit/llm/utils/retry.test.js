const {
  createRetry,
  withRetry,
  isRetryable,
  calculateDelay,
  RETRYABLE_ERROR_CODES,
  RETRYABLE_STATUS_CODES
} = require('../../../../src/llm/utils/retry');

describe('Retry Utilities', () => {
  describe('isRetryable', () => {
    it('should identify retryable error codes', () => {
      RETRYABLE_ERROR_CODES.forEach(code => {
        const error = new Error('Test error');
        error.code = code;
        expect(isRetryable(error)).toBe(true);
      });
    });

    it('should identify retryable HTTP status codes', () => {
      RETRYABLE_STATUS_CODES.forEach(status => {
        const error = new Error('Test error');
        error.response = { status };
        expect(isRetryable(error)).toBe(true);
      });
    });

    it('should identify retryable error messages', () => {
      const retryableMessages = [
        'Network error occurred',
        'Request timeout',
        'Rate limit exceeded'
      ];

      retryableMessages.forEach(message => {
        const error = new Error(message);
        expect(isRetryable(error)).toBe(true);
      });
    });

    it('should not retry non-retryable errors', () => {
      const error = new Error('Invalid API key');
      expect(isRetryable(error)).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      const config = {
        backoff: 'exponential',
        initialDelay: 1000,
        factor: 2,
        maxDelay: 10000,
        jitter: false
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(8000);
      expect(calculateDelay(4, config)).toBe(10000); // Capped at maxDelay
    });

    it('should calculate linear backoff', () => {
      const config = {
        backoff: 'linear',
        initialDelay: 1000,
        maxDelay: 10000,
        jitter: false
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(3000);
    });

    it('should use constant delay', () => {
      const config = {
        backoff: 'constant',
        initialDelay: 1000,
        maxDelay: 10000,
        jitter: false
      };

      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(1000);
      expect(calculateDelay(2, config)).toBe(1000);
    });

    it('should add jitter when enabled', () => {
      const config = {
        backoff: 'exponential',
        initialDelay: 1000,
        factor: 2,
        maxDelay: 10000,
        jitter: true
      };

      // Run multiple times to ensure jitter is applied
      const delays = Array.from({ length: 10 }, () => calculateDelay(1, config));
      const uniqueDelays = new Set(delays);
      
      // Should have some variation due to jitter
      expect(uniqueDelays.size).toBeGreaterThan(1);
      
      // All delays should be within expected range (2000 ± 20%)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(1600);
        expect(delay).toBeLessThanOrEqual(2400);
      });
    });
  });

  describe('createRetry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Network error');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'Success';
      });

      const retry = createRetry({ 
        maxRetries: 3,
        initialDelay: 10,
        jitter: false
      });
      
      const result = await retry(operation);
      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Invalid input');
      });

      const retry = createRetry({ maxRetries: 3 });
      
      await expect(retry(operation)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      let attempts = 0;
      
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'Success';
      });

      const retry = createRetry({ 
        maxRetries: 3,
        onRetry,
        initialDelay: 10
      });
      
      await retry(operation);
      
      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          attempt: expect.any(Number),
          delay: expect.any(Number),
          willRetry: true
        })
      );
    });

    it('should respect maxRetries limit', async () => {
      const operation = jest.fn(async () => {
        const error = new Error('Persistent error');
        error.code = 'ECONNRESET';
        throw error;
      });

      const retry = createRetry({ 
        maxRetries: 2,
        initialDelay: 10
      });
      
      await expect(retry(operation)).rejects.toThrow('Persistent error');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withRetry', () => {
    it('should wrap function with retry logic', async () => {
      let attempts = 0;
      const originalFunction = async (x) => {
        attempts++;
        if (attempts < 2) {
          const error = new Error('Temporary failure');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return x * 2;
      };

      const retryableFunction = withRetry(
        { maxRetries: 3, initialDelay: 10 },
        originalFunction
      );
      
      const result = await retryableFunction(5);
      expect(result).toBe(10);
      expect(attempts).toBe(2);
    });
  });
});