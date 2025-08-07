const request = require('supertest');
const { createApp } = require('../../src/app');
const { getConfig } = require('../../src/utils/config');

jest.mock('../../src/utils/config');

describe('/v2/evaluate/job-fit endpoint', () => {
  let app;

  beforeEach(() => {
    getConfig.mockImplementation((key, defaultValue) => {
      const configs = {
        'evaluation.threshold': 0.75,
        'llm.useMock': true,
        'llm.provider': 'mock',
        'llm.model': 'mock-model',
        'llm.temperature': 0.7,
        'version': '0.22.0'
      };
      return configs[key] || defaultValue;
    });
    
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v2/evaluate/job-fit', () => {
    const validRequest = {
      job_description: `Senior Software Engineer - Full Stack
      
      We are looking for an experienced Senior Software Engineer to join our team. 
      The ideal candidate will have:
      - 5+ years of experience with Node.js and React
      - Strong experience with cloud platforms (AWS/GCP/Azure)
      - Experience leading technical projects and mentoring junior developers
      - Solid understanding of microservices architecture
      - Experience with Docker, Kubernetes, and CI/CD pipelines
      - Bachelor's degree in Computer Science or related field`,
      
      resume: `John Doe
      Senior Software Engineer
      
      Professional Summary:
      Experienced full-stack engineer with 6 years building scalable web applications.
      Strong expertise in Node.js, React, and AWS cloud services.
      
      Experience:
      Tech Lead - ABC Corp (2021-Present)
      - Led team of 4 engineers building microservices platform
      - Architected cloud-native solution serving 1M+ users
      - Implemented CI/CD pipeline reducing deployment time by 60%
      
      Software Engineer - XYZ Inc (2018-2021)
      - Developed React/Node.js applications for e-commerce platform
      - Designed RESTful APIs handling 10K+ requests/minute
      - Mentored 2 junior developers
      
      Skills:
      Languages: JavaScript, TypeScript, Python
      Frontend: React, Redux, Next.js
      Backend: Node.js, Express, GraphQL
      Cloud: AWS (EC2, S3, Lambda), Docker, Kubernetes
      
      Education:
      B.S. Computer Science - State University (2018)`,
      
      provider: 'mock',
      model: 'mock-model',
      temperature: 0.7
    };

    it('should return successful job-fit evaluation with all response fields', async () => {
      const response = await request(app)
        .post('/v2/evaluate/job-fit')
        .send(validRequest)
        .expect(200);

      // Core job fit results
      expect(response.body).toMatchObject({
        job_fit_score: expect.any(Number),
        match_category: expect.stringMatching(/^(excellent|good|fair|poor)$/),
        recommendation: expect.any(String),
        
        // V2 enhancements
        should_improve: expect.any(Boolean),
        improvement_potential: expect.stringMatching(/^(minimal|moderate|high|low)$/),
        
        // Gaps and strengths
        key_gaps: expect.any(Array),
        transferable_strengths: expect.any(Array),
        fit_summary: expect.any(String),
        
        // New recommendations array
        recommendations: expect.any(Array),
        
        // Detailed breakdown
        breakdown: {
          experience_score: expect.any(Number),
          skills_score: expect.any(Number),
          industry_score: expect.any(Number),
          level_score: expect.any(Number),
          essential_requirements_score: expect.any(Number)
        },
        
        // Match flags
        experience_level_match: expect.any(Boolean),
        core_skills_match: expect.any(Boolean),
        industry_match: expect.any(Boolean),
        
        // Metadata
        execution_time: expect.any(Number),
        llm_provider: 'mock',
        llm_model: 'mock-1.0',
        llm_temperature: 0.7,
        process_markdown: true,
        version: '0.22.0',
        api_version: 'v2'
      });

      // Validate score ranges
      expect(response.body.job_fit_score).toBeGreaterThanOrEqual(0);
      expect(response.body.job_fit_score).toBeLessThanOrEqual(1);
      
      // Validate breakdown scores
      Object.values(response.body.breakdown).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });
    });

    describe('match categories', () => {
      it('should handle good match scenario', async () => {
        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(validRequest)
          .expect(200);

        // Mock returns good match by default
        expect(response.body.match_category).toBe('good');
        expect(response.body.job_fit_score).toBeGreaterThanOrEqual(0.6);
        expect(response.body.should_improve).toBe(true);
        expect(response.body.improvement_strategy).toBeTruthy();
      });

      it('should return appropriate improvement strategy based on score', async () => {
        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(validRequest)
          .expect(200);

        if (response.body.job_fit_score >= 0.8) {
          expect(response.body.should_improve).toBe(false);
        } else if (response.body.job_fit_score >= 0.6) {
          expect(response.body.improvement_strategy).toBe('enhance_relevant_experience');
        } else if (response.body.job_fit_score >= 0.4) {
          expect(response.body.improvement_strategy).toBe('focus_transferable_skills');
        } else {
          expect(response.body.improvement_strategy).toBe('major_restructuring_required');
        }
      });
    });

    describe('V2 enhancement fields', () => {
      it('should include detailed improvement recommendations', async () => {
        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(validRequest)
          .expect(200);

        expect(response.body.recommendations).toBeInstanceOf(Array);
        expect(response.body.recommendations.length).toBeGreaterThan(0);
        expect(response.body.recommendations[0]).toMatch(/resume|experience|skills|requirements/i);
      });

      it('should identify improvement strategy when needed', async () => {
        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(validRequest)
          .expect(200);

        if (response.body.should_improve) {
          expect(response.body.improvement_strategy).toBeTruthy();
          expect(['enhance_relevant_experience', 'focus_transferable_skills', 'major_restructuring_required'])
            .toContain(response.body.improvement_strategy);
        }
      });
    });

    describe('optional parameters', () => {
      it('should handle missing optional parameters', async () => {
        const minimalRequest = {
          job_description: 'Software Engineer position requiring JavaScript and cloud experience. Must have at least 3 years of experience in web development.',
          resume: 'John Doe, Software Engineer with 5 years JavaScript and AWS experience. Built several production applications.'
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(minimalRequest)
          .expect(200);

        expect(response.body).toHaveProperty('job_fit_score');
        expect(response.body.llm_provider).toBe('mock');
        expect(response.body.process_markdown).toBe(true);
      });

      it('should respect provided optional parameters', async () => {
        const customRequest = {
          ...validRequest,
          temperature: 0.3,
          process_markdown: false
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(customRequest)
          .expect(200);

        expect(response.body.llm_temperature).toBe(0.3);
        expect(response.body.process_markdown).toBe(false);
      });

      it('should handle original_resume parameter', async () => {
        const requestWithOriginal = {
          ...validRequest,
          original_resume: 'Original resume content before modifications with 5 years experience'
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(requestWithOriginal)
          .expect(200);

        expect(response.body).toHaveProperty('job_fit_score');
        // When original_resume is provided, it should be used for evaluation
      });
    });

    describe('validation errors', () => {
      it('should require job_description', async () => {
        const invalidRequest = {
          resume: 'John Doe, Software Engineer'
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).toBe('Validation failed');
        expect(response.body.error.errors).toContainEqual(
          expect.objectContaining({
            field: 'job_description',
            message: 'Job description is required'
          })
        );
      });

      it('should require resume', async () => {
        const invalidRequest = {
          job_description: 'Software Engineer position'
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.errors).toContainEqual(
          expect.objectContaining({
            field: 'resume',
            message: 'Resume is required'
          })
        );
      });

      it('should validate minimum length for job_description', async () => {
        const invalidRequest = {
          job_description: 'Short JD',
          resume: validRequest.resume
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error.errors).toContainEqual(
          expect.objectContaining({
            field: 'job_description',
            message: expect.stringContaining('at least 100 characters')
          })
        );
      });

      it('should validate minimum length for resume', async () => {
        const invalidRequest = {
          job_description: validRequest.job_description,
          resume: 'Too short'
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error.errors).toContainEqual(
          expect.objectContaining({
            field: 'resume',
            message: expect.stringContaining('at least 100 characters')
          })
        );
      });

      it('should validate temperature range', async () => {
        const invalidRequest = {
          ...validRequest,
          temperature: 2.5 // Invalid temperature
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error.errors).toContainEqual(
          expect.objectContaining({
            field: 'temperature',
            message: expect.stringContaining('Temperature must be between 0 and 2')
          })
        );
      });

      it('should validate provider enum', async () => {
        const invalidRequest = {
          ...validRequest,
          provider: 'invalid-provider'
        };

        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error.errors).toContainEqual(
          expect.objectContaining({
            field: 'provider',
            message: expect.stringContaining('Invalid provider')
          })
        );
      });
    });

    describe('execution characteristics', () => {
      it('should include execution time', async () => {
        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(validRequest)
          .expect(200);

        expect(response.body.execution_time).toBeGreaterThan(0);
        expect(response.body.execution_time).toBeLessThan(10); // Should be fast with mock
      });

      it('should return consistent API version', async () => {
        const response = await request(app)
          .post('/v2/evaluate/job-fit')
          .send(validRequest)
          .expect(200);

        expect(response.body.api_version).toBe('v2');
        expect(response.body.version).toBe('0.22.0');
      });
    });
  });
});