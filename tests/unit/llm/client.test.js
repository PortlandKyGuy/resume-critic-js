const { createLLMClient, createMockClient, createTestClient } = require('../../../src/llm/client');

describe('LLM Client', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.USE_MOCK_LLM;
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;
  });

  describe('createLLMClient', () => {
    it('should create mock client when useMock is true', () => {
      const client = createLLMClient({ useMock: true });
      
      expect(client.provider).toBe('mock');
      expect(client.model).toBe('mock-1.0');
      expect(typeof client.complete).toBe('function');
    });

    it('should create mock client when USE_MOCK_LLM env is true', () => {
      process.env.USE_MOCK_LLM = 'true';
      const client = createLLMClient();
      
      expect(client.provider).toBe('mock');
    });

    it('should NOT create mock client in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      process.env.OPENAI_API_KEY = 'test-key';
      
      const client = createLLMClient();
      expect(client.provider).toBe('openai');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        createLLMClient({ provider: 'unknown', useMock: false });
      }).toThrow('Unknown LLM provider: unknown');
    });

    it('should create OpenAI client by default', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const client = createLLMClient({ useMock: false });
      expect(client.provider).toBe('openai');
    });

    it('should respect provider configuration', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      
      const client = createLLMClient({ 
        provider: 'gemini',
        useMock: false 
      });
      expect(client.provider).toBe('gemini');
    });
  });

  describe('createMockClient', () => {
    it('should create mock client with custom responses', async () => {
      const customResponses = {
        'test': 'Custom test response'
      };
      
      const client = createMockClient(customResponses);
      expect(client.provider).toBe('mock');
      
      const response = await client.complete({ user: 'test query' });
      expect(response).toBe('Custom test response');
    });
  });

  describe('createTestClient', () => {
    it('should create test client with default response', async () => {
      const client = createTestClient();
      expect(client.provider).toBe('mock');
      
      const response = await client.complete({ user: 'default query' });
      expect(response).toBe('Test response');
    });
  });

  describe('retry logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      
      // Create a client with retry configuration
      const client = createLLMClient({
        useMock: true,
        retry: {
          maxRetries: 3,
          initialDelay: 10
        }
      });
      
      // Override the provider's complete function to test retry
      const originalComplete = client.complete;
      const mockComplete = jest.fn(async (options) => {
        attempts++;
        if (attempts < 3) {
          const error = new Error('Network error');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'Success after retries';
      });
      
      // Replace the wrapped complete function with one that uses our mock
      client.complete = async (options) => {
        const { withRetry } = require('../../../src/llm/utils/retry');
        const retryWrapper = withRetry({ maxRetries: 3, initialDelay: 10 }, mockComplete);
        return retryWrapper(options);
      };
      
      const response = await client.complete({ user: 'test' });
      expect(response).toBe('Success after retries');
      expect(attempts).toBe(3);
    });
  });
});