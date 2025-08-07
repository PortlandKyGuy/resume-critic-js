const { curry } = require('ramda');
const { logger } = require('../../utils/logger');

/**
 * Simulate network delay
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise} Delay promise
 */
const simulateDelay = (min, max) => new Promise(resolve => {
  setTimeout(resolve, Math.random() * (max - min) + min);
});

/**
 * Find custom response based on prompt
 * @param {Object} responses - Response mappings
 * @param {Object} options - Request options
 * @returns {string|null} Custom response or null
 */
const findCustomResponse = (responses, options) => {
  const key = Object.keys(responses).find(k => options.user.toLowerCase().includes(k.toLowerCase()));
  return key ? responses[key] : null;
};

/**
 * Generate batch evaluation response
 * @returns {string} JSON response for batch evaluation
 */
const generateBatchEvaluationResponse = () => JSON.stringify({
  evaluations: [
    {
      critic: 'keyword',
      score: 75,
      feedback: 'Mock: Good keyword coverage with room for improvement in technical terms'
    },
    {
      critic: 'experience',
      score: 82,
      feedback: 'Mock: Strong experience alignment with job requirements'
    },
    {
      critic: 'impact',
      score: 68,
      feedback: 'Mock: Consider adding more quantifiable achievements'
    },
    {
      critic: 'readability',
      score: 88,
      feedback: 'Mock: Well-structured and easy to read'
    },
    {
      critic: 'completeness',
      score: 90,
      feedback: 'Mock: Comprehensive coverage of all major sections'
    },
    {
      critic: 'relevance',
      score: 79,
      feedback: 'Mock: Mostly relevant with some extraneous details'
    },
    {
      critic: 'requirements',
      score: 85,
      feedback: 'Mock: Meets most of the stated requirements'
    }
  ]
});

/**
 * Get default mock responses
 * @returns {Object} Default response mappings
 */
const getDefaultResponses = () => ({
  // Keyword critic response - matches the prompt pattern
  'must-have': JSON.stringify({
    score: 0.8,
    missing_must_have: [],
    missing_nice_have: ['GraphQL', 'Docker'],
    present_terms: ['Node.js', 'React', 'AWS', 'Software Engineer'],
    suggestions: ['Consider adding experience with Docker if applicable']
  }),
  // Readability critic response
  readability: JSON.stringify({
    appropriateness_score: 0.85,
    flesch_kincaid_score: 45.2,
    issues: [],
    suggestions: ['Consider using more action verbs']
  }),
  // Relevance critic response - matches the actual prompt text
  'evaluate how well this resume is tailored': JSON.stringify({
    score: 4,
    strengths: ['Strong technical background aligns with job requirements', 'Leadership experience matches the seniority level'],
    gaps: ['Missing specific cloud platform experience mentioned in JD'],
    suggestions: ['Highlight AWS/GCP experience more prominently', 'Add metrics to quantify team leadership impact']
  }),
  // Language critic response
  'language quality': JSON.stringify({
    score: 4,
    errors: [],
    suggestions: ['Add more quantifiable achievements']
  }),
  'job fit': JSON.stringify({
    job_fit_score: 0.78,
    match_category: 'good',
    recommendation: 'proceed_with_full_evaluation',
    key_gaps: ['Advanced cloud architecture experience'],
    transferable_strengths: ['Strong programming skills', 'Team leadership']
  }),
  // Job fit critic response - matches the actual prompt text
  "evaluate the candidate's fundamental fit": JSON.stringify({
    job_fit_score: 0.78,
    match_category: 'good',
    experience_level_match: true,
    core_skills_match: true,
    industry_match: true,
    key_gaps: ['Advanced cloud architecture experience'],
    transferable_strengths: ['Strong programming skills', 'Team leadership'],
    fit_summary: 'Strong technical background with relevant experience in Node.js and cloud technologies',
    recommendation: 'proceed_with_full_evaluation',
    experience_score: 0.8,
    skills_score: 0.75,
    industry_score: 0.85,
    level_score: 0.8,
    essential_requirements_score: 0.7,
    __debug_reasoning__: 'Candidate has strong Node.js and React experience matching the job requirements'
  }),
  'summary evaluation': JSON.stringify({
    evaluations: [{
      critic: 'summary',
      score: 80,
      feedback: 'Mock: Compelling summary with clear value proposition'
    }]
  }),
  'work experience': JSON.stringify({
    evaluations: [{
      critic: 'workExperience',
      score: 77,
      feedback: 'Mock: Strong technical experience with relevant projects'
    }]
  }),
  accomplishments: JSON.stringify({
    evaluations: [{
      critic: 'accomplishments',
      score: 73,
      feedback: 'Mock: Good mix of technical and leadership achievements'
    }]
  })
});

/**
 * Create mock complete function
 * @param {Object} responses - Response mappings
 * @returns {Function} Mock complete function
 */
const createMockComplete = curry(async (responses, options) => {
  const startTime = Date.now();
  const delayMin = 100;
  const delayMax = 300;
  const delay = Math.random() * (delayMax - delayMin) + delayMin;

  logger.debug('Mock: Starting completion request', {
    hasSystem: !!options.system,
    userPromptLength: options.user?.length,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    simulatedDelay: Math.round(delay)
  });

  // Simulate network delay
  await simulateDelay(delayMin, delayMax);

  // Check for specific mock response
  const customResponse = findCustomResponse(responses, options);
  if (customResponse) {
    const duration = Date.now() - startTime;
    logger.debug('Mock: Found custom response', {
      duration,
      matchedKey: Object.keys(responses).find(k => options.user.toLowerCase().includes(k.toLowerCase())),
      responseLength: customResponse.length
    });
    logger.info('Mock: Completion successful (custom response)', {
      duration,
      responseLength: customResponse.length
    });
    return customResponse;
  }

  // Generate appropriate mock response based on prompt
  if (options.user.includes('evaluate this resume')) {
    const response = generateBatchEvaluationResponse();
    const duration = Date.now() - startTime;
    logger.debug('Mock: Generated batch evaluation response', {
      duration,
      evaluationCount: 7,
      responseLength: response.length
    });
    logger.info('Mock: Completion successful (batch evaluation)', {
      duration,
      responseLength: response.length
    });
    return response;
  }

  const defaultResponse = `Mock response for: ${options.user.substring(0, 50)}`;
  const duration = Date.now() - startTime;
  logger.debug('Mock: Generated default response', {
    duration,
    promptPreview: options.user.substring(0, 50),
    responseLength: defaultResponse.length
  });
  logger.info('Mock: Completion successful (default)', {
    duration,
    responseLength: defaultResponse.length
  });
  return defaultResponse;
});

/**
 * Create mock provider for development and testing
 * @param {Object} config - Configuration object
 * @returns {Object} Mock provider instance
 */
const createMockProvider = (config = {}) => {
  const responses = config.responses || getDefaultResponses();

  logger.debug('Mock: Creating provider', {
    hasCustomResponses: !!config.responses,
    responseCount: Object.keys(responses).length,
    model: 'mock-1.0'
  });

  logger.info('Mock: Provider initialized', {
    model: 'mock-1.0',
    customResponseKeys: config.responses ? Object.keys(config.responses) : ['default responses']
  });

  // Create a mutable responses object for testing purposes
  const mutableResponses = { ...responses };

  return {
    name: 'mock',
    model: 'mock-1.0',
    complete: createMockComplete(mutableResponses),
    responses: mutableResponses // Expose for testing
  };
};

/**
 * Development helper to set mock response
 * @param {Object} provider - Provider instance
 * @param {string} key - Response key
 * @param {string} response - Response value
 * @returns {Object} Provider instance
 */
const setMockResponse = curry((provider, key, response) => {
  if (provider.name === 'mock' && provider.responses) {
    // eslint-disable-next-line no-param-reassign, fp/no-mutation
    provider.responses[key] = response;
    logger.debug('Mock: Response mapping updated', {
      key,
      responseLength: response.length
    });
  } else {
    logger.warn('Mock: Failed to set response', {
      providerName: provider.name,
      hasResponses: !!provider.responses,
      key
    });
  }
  return provider;
});

module.exports = {
  createMockProvider,
  setMockResponse
};
