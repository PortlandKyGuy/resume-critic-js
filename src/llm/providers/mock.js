const { curry } = require('ramda');

/**
 * Simulate network delay
 * @param {number} min - Minimum delay in ms
 * @param {number} max - Maximum delay in ms
 * @returns {Promise} Delay promise
 */
const simulateDelay = (min, max) => new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

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
  'job fit': JSON.stringify({
    job_fit_score: 0.78,
    match_category: 'good',
    recommendation: 'proceed_with_full_evaluation',
    key_gaps: ['Advanced cloud architecture experience'],
    transferable_strengths: ['Strong programming skills', 'Team leadership']
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
  // Simulate network delay
  await simulateDelay(100, 300);

  // Check for specific mock response
  const customResponse = findCustomResponse(responses, options);
  if (customResponse) return customResponse;

  // Generate appropriate mock response based on prompt
  if (options.user.includes('evaluate this resume')) {
    return generateBatchEvaluationResponse();
  }

  return `Mock response for: ${options.user.substring(0, 50)}`;
});

/**
 * Create mock provider for development and testing
 * @param {Object} config - Configuration object
 * @returns {Object} Mock provider instance
 */
const createMockProvider = (config = {}) => {
  const responses = config.responses || getDefaultResponses();

  return {
    name: 'mock',
    model: 'mock-1.0',
    complete: createMockComplete(responses)
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
    // eslint-disable-next-line no-param-reassign
    provider.responses[key] = response;
  }
  return provider;
});

module.exports = {
  createMockProvider,
  setMockResponse
};
