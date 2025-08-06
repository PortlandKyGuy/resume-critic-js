const request = require('supertest');
const { createApp } = require('../../src/app');
const { getConfig } = require('../../src/utils/config');

jest.mock('../../src/utils/config');

describe('/v2/evaluate endpoint', () => {
  let app;

  beforeEach(() => {
    getConfig.mockImplementation((key, defaultValue) => {
      const configs = {
        'evaluation.threshold': 0.75,
        'llm.useMock': true,
        'llm.provider': 'mock',
        'llm.model': 'mock-model',
        'llm.temperature': 0.7
      };
      return configs[key] || defaultValue;
    });
    
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v2/evaluate', () => {
    const validRequest = {
      job_description: 'Senior Software Engineer position requiring expertise in Node.js, React, and cloud technologies. We are looking for someone with strong experience in building scalable web applications and microservices. The ideal candidate will have experience with AWS, Docker, and modern CI/CD practices.',
      resume: 'John Doe\nSoftware Engineer\nExperience: 5 years Node.js, 3 years React, AWS certified. Built scalable microservices for e-commerce platform serving 1M+ users. Led team of 4 developers. Implemented CI/CD pipeline using Jenkins and Docker. Strong problem-solving skills and attention to detail.',
      original_resume: null,
      provider: 'mock',
      model: 'mock-model',
      temperature: 0.7
    };

    it('should return batch evaluation results with all critics', async () => {
      const response = await request(app)
        .post('/v2/evaluation/evaluate')
        .send(validRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        composite_score: expect.any(Number),
        normalized_scores: {
          keyword: expect.any(Number),
          readability: expect.any(Number),
          relevance: expect.any(Number),
          language: expect.any(Number)
        },
        raw_results: {
          keyword: expect.any(Object),
          readability: expect.any(Object),
          relevance: expect.any(Object),
          language: expect.any(Object)
        },
        pass: expect.any(Boolean),
        threshold: 0.75,
        llm_provider: 'mock',
        llm_model: 'mock-1.0',
        execution_time: expect.any(Number)
      });

      expect(response.body.composite_score).toBeGreaterThanOrEqual(0);
      expect(response.body.composite_score).toBeLessThanOrEqual(1);
    });

    it('should normalize scores correctly', async () => {
      const response = await request(app)
        .post('/v2/evaluation/evaluate')
        .send(validRequest)
        .expect(200);

      Object.values(response.body.normalized_scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate pass/fail based on threshold', async () => {
      const response = await request(app)
        .post('/v2/evaluation/evaluate')
        .send(validRequest)
        .expect(200);

      const { composite_score, pass, threshold } = response.body;
      expect(pass).toBe(composite_score >= threshold);
    });

    it('should handle missing optional parameters', async () => {
      const minimalRequest = {
        job_description: 'Software Engineer position at our company. We are looking for a talented developer with strong programming skills and experience in modern web technologies. The role involves developing and maintaining our core platform services.',
        resume: 'John Doe, Software Engineer with 5+ years of experience. Proficient in JavaScript, Python, and Java. Built multiple web applications using React and Node.js. Strong background in database design and system architecture. Excellent problem-solving and communication skills.'
      };

      const response = await request(app)
        .post('/v2/evaluation/evaluate')
        .send(minimalRequest)
        .expect(200);

      expect(response.body).toHaveProperty('composite_score');
      expect(response.body.llm_provider).toBe('mock');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        job_description: 'Software Engineer'
        // missing resume
      };

      await request(app)
        .post('/v2/evaluation/evaluate')
        .send(invalidRequest)
        .expect(400);
    });

    it('should include execution time', async () => {
      const response = await request(app)
        .post('/v2/evaluation/evaluate')
        .send(validRequest)
        .expect(200);

      expect(response.body.execution_time).toBeGreaterThan(0);
      expect(response.body.execution_time).toBeLessThan(10); // Should be fast with mock
    });
  });
});