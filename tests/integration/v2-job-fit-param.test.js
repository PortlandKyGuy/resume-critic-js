const request = require('supertest');
const { createApp } = require('../../src/app');
const { getConfig } = require('../../src/utils/config');

jest.mock('../../src/utils/config');

describe('/v2/evaluate with job_fit_score parameter', () => {
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

  const validRequest = {
    job_description: 'Senior Software Engineer position requiring 5+ years of experience with Node.js, React, and cloud technologies.',
    resume: `John Doe
Senior Software Engineer

Experience:
- 7 years developing scalable web applications
- Expert in Node.js, React, and AWS
- Led team of 5 engineers

Skills: Node.js, React, AWS, Docker, Kubernetes`
  };

  it('should use provided job_fit_score instead of calculating it', async () => {
    const providedJobFitScore = 0.85;
    
    const response = await request(app)
      .post('/v2/evaluate')
      .send({
        ...validRequest,
        job_fit_score: providedJobFitScore
      })
      .expect(200);

    // Should use the provided job fit score
    expect(response.body.job_fit_score).toBe(providedJobFitScore);
    
    // Should still have job_fit in critic_results with provided score
    expect(response.body.critic_results.job_fit).toBeDefined();
    expect(response.body.critic_results.job_fit.job_fit_score).toBe(providedJobFitScore);
    expect(response.body.critic_results.job_fit.fit_summary).toBe('Job fit score provided by user');
    
    // Should include job_fit in normalized scores
    expect(response.body.normalized_scores.job_fit).toBe(providedJobFitScore);
  });

  it('should validate job_fit_score is between 0 and 1', async () => {
    const response = await request(app)
      .post('/v2/evaluate')
      .send({
        ...validRequest,
        job_fit_score: 1.5 // Invalid score
      })
      .expect(400);

    expect(response.body.error).toBeDefined();
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error.errors).toBeDefined();
    expect(response.body.error.errors[0].message).toContain('Job fit score must be between 0 and 1');
  });

  it('should calculate job_fit_score when not provided', async () => {
    const response = await request(app)
      .post('/v2/evaluate')
      .send(validRequest)
      .expect(200);

    // Should have calculated job_fit_score
    expect(response.body.job_fit_score).toBeDefined();
    expect(typeof response.body.job_fit_score).toBe('number');
    
    // Should have job_fit critic results
    expect(response.body.critic_results.job_fit).toBeDefined();
    expect(response.body.critic_results.job_fit.job_fit_score).toBeDefined();
    
    // fit_summary should not be the "provided by user" message
    expect(response.body.critic_results.job_fit.fit_summary).not.toBe('Job fit score provided by user');
  });

  it('should accept job_fit_score of 0', async () => {
    const response = await request(app)
      .post('/v2/evaluate')
      .send({
        ...validRequest,
        job_fit_score: 0
      })
      .expect(200);

    expect(response.body.job_fit_score).toBe(0);
  });

  it('should accept job_fit_score of 1', async () => {
    const response = await request(app)
      .post('/v2/evaluate')
      .send({
        ...validRequest,
        job_fit_score: 1
      })
      .expect(200);

    expect(response.body.job_fit_score).toBe(1);
  });
});