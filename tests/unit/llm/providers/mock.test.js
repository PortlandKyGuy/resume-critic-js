const { createMockProvider, setMockResponse } = require('../../../../src/llm/providers/mock');

describe('Mock Provider', () => {
  describe('createMockProvider', () => {
    it('should create mock provider with default responses', () => {
      const provider = createMockProvider();
      
      expect(provider.name).toBe('mock');
      expect(provider.model).toBe('mock-1.0');
      expect(typeof provider.complete).toBe('function');
    });

    it('should create mock provider with custom responses', async () => {
      const customResponses = {
        'hello': 'Hello response',
        'test': 'Test response'
      };
      
      const provider = createMockProvider({ responses: customResponses });
      const response = await provider.complete({ user: 'hello world' });
      
      expect(response).toBe('Hello response');
    });
  });

  describe('complete function', () => {
    it('should simulate network delay', async () => {
      const provider = createMockProvider();
      const startTime = Date.now();
      
      await provider.complete({ user: 'test' });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(duration).toBeLessThan(400);
    });

    it('should return batch evaluation response for resume evaluation', async () => {
      const provider = createMockProvider();
      const response = await provider.complete({ 
        user: 'Please evaluate this resume against the job description' 
      });
      
      const parsed = JSON.parse(response);
      expect(parsed.evaluations).toBeDefined();
      expect(Array.isArray(parsed.evaluations)).toBe(true);
      expect(parsed.evaluations.length).toBe(7);
      
      const firstEval = parsed.evaluations[0];
      expect(firstEval).toHaveProperty('critic');
      expect(firstEval).toHaveProperty('score');
      expect(firstEval).toHaveProperty('feedback');
    });

    it('should return job fit response', async () => {
      const provider = createMockProvider();
      const response = await provider.complete({ 
        user: 'Evaluate job fit for this candidate' 
      });
      
      const parsed = JSON.parse(response);
      expect(parsed.job_fit_score).toBe(0.78);
      expect(parsed.match_category).toBe('good');
      expect(parsed.recommendation).toBe('proceed_with_full_evaluation');
    });

    it('should return summary evaluation response', async () => {
      const provider = createMockProvider();
      const response = await provider.complete({ 
        user: 'Provide summary evaluation' 
      });
      
      const parsed = JSON.parse(response);
      expect(parsed.evaluations[0].critic).toBe('summary');
      expect(parsed.evaluations[0].score).toBe(80);
    });

    it('should return default response for unknown prompts', async () => {
      const provider = createMockProvider();
      const response = await provider.complete({ 
        user: 'Some random prompt that is not recognized' 
      });
      
      expect(response).toContain('Mock response for:');
      expect(response).toContain('Some random prompt');
    });
  });

  describe('setMockResponse', () => {
    it('should set custom response for provider', async () => {
      const provider = createMockProvider();
      const updatedProvider = setMockResponse(provider, 'custom', 'Custom response');
      
      expect(updatedProvider).toBe(provider); // Should return same instance
      
      const response = await provider.complete({ user: 'custom query' });
      expect(response).toBe('Custom response');
    });

    it('should not affect non-mock providers', () => {
      const nonMockProvider = { name: 'openai', responses: {} };
      const result = setMockResponse(nonMockProvider, 'key', 'value');
      
      expect(result).toBe(nonMockProvider);
      expect(nonMockProvider.responses.key).toBeUndefined();
    });
  });

  describe('default responses', () => {
    it('should have all expected default responses', async () => {
      const provider = createMockProvider();
      
      // Test work experience response
      const workExpResponse = await provider.complete({ 
        user: 'Evaluate work experience section' 
      });
      const workExpParsed = JSON.parse(workExpResponse);
      expect(workExpParsed.evaluations[0].critic).toBe('workExperience');
      
      // Test accomplishments response
      const accomplishmentsResponse = await provider.complete({ 
        user: 'Review accomplishments and achievements' 
      });
      const accomplishmentsParsed = JSON.parse(accomplishmentsResponse);
      expect(accomplishmentsParsed.evaluations[0].critic).toBe('accomplishments');
    });
  });
});