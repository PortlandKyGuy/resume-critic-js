const { createMockProvider } = require('./providers/mock');
const { createOpenAIProvider } = require('./providers/openai');
const { createGeminiProvider } = require('./providers/gemini');
const { createOllamaProvider } = require('./providers/ollama');
const { withRetry } = require('./utils/retry');

/**
 * Check if mock should be used
 * @param {Object} config - Configuration object
 * @returns {boolean} True if mock should be used
 */
const shouldUseMock = config => config.useMock
  || process.env.USE_MOCK_LLM === 'true';

/**
 * Get API key for a provider
 * @param {string} providerName - Provider name
 * @returns {string|undefined} API key
 */
const getApiKey = providerName => {
  const keyMap = {
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
    ollama: 'OLLAMA_API_KEY'
  };

  const envVarName = keyMap[providerName.toLowerCase()];
  return envVarName ? process.env[envVarName] : undefined;
};

/**
 * Select provider based on configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Provider instance
 */
const selectProvider = config => {
  // Check for mock mode
  if (shouldUseMock(config)) {
    return createMockProvider(config.mock);
  }

  // Select real provider
  const providerName = config.provider || process.env.LLM_PROVIDER || 'openai';

  // Validate provider name
  const validProviders = ['openai', 'gemini', 'ollama'];
  if (!validProviders.includes(providerName.toLowerCase())) {
    throw new Error(`Unknown LLM provider: ${providerName}. Valid providers: ${validProviders.join(', ')}`);
  }

  const providerConfig = {
    apiKey: config.apiKey || getApiKey(providerName),
    model: config.model || process.env.LLM_MODEL,
    ...config
  };

  switch (providerName.toLowerCase()) {
    case 'openai':
      return createOpenAIProvider(providerConfig);
    case 'gemini':
      return createGeminiProvider(providerConfig);
    case 'ollama':
      return createOllamaProvider(providerConfig);
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }
};

/**
 * Factory function to create LLM client
 * @param {Object} config - Configuration object
 * @returns {Object} LLM client with provider info and complete method
 */
const createLLMClient = (config = {}) => {
  const provider = selectProvider(config);

  return {
    provider: provider.name,
    model: provider.model,
    complete: withRetry(config.retry || {}, provider.complete)
  };
};

/**
 * Development utility to create mock client
 * @param {Object} responses - Mock responses
 * @returns {Object} Mock LLM client
 */
const createMockClient = responses => createLLMClient({
  useMock: true,
  mock: { responses }
});

/**
 * Create test client with default responses
 * @returns {Object} Test LLM client
 */
const createTestClient = () => createMockClient({
  default: 'Test response'
});

module.exports = {
  createLLMClient,
  createMockClient,
  createTestClient
};
