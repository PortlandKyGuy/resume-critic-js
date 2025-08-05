const { createMockProvider } = require('./providers/mock');
const { createOpenAIProvider } = require('./providers/openai');
const { createGeminiProvider } = require('./providers/gemini');
const { createOllamaProvider } = require('./providers/ollama');
const { withRetry } = require('./utils/retry');
const { logger } = require('../utils/logger');

/**
 * Check if mock should be used
 * @param {Object} config - Configuration object
 * @returns {boolean} True if mock should be used
 */
const shouldUseMock = config => {
  const useMock = config.useMock || process.env.USE_MOCK_LLM === 'true';
  logger.debug('LLM: Checking mock mode', {
    configUseMock: config.useMock,
    envUseMock: process.env.USE_MOCK_LLM,
    result: useMock
  });
  return useMock;
};

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
  const apiKey = envVarName ? process.env[envVarName] : undefined;
  
  logger.debug('LLM: Retrieving API key', {
    provider: providerName,
    envVar: envVarName,
    hasKey: !!apiKey
  });
  
  return apiKey;
};

/**
 * Select provider based on configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Provider instance
 */
const selectProvider = config => {
  logger.debug('LLM: Selecting provider', {
    config: {
      provider: config.provider,
      model: config.model,
      hasApiKey: !!config.apiKey,
      useMock: config.useMock
    }
  });

  // Check for mock mode
  if (shouldUseMock(config)) {
    logger.info('LLM: Using mock provider');
    return createMockProvider(config.mock);
  }

  // Select real provider
  const providerName = config.provider || process.env.LLM_PROVIDER || 'openai';
  logger.debug('LLM: Provider name resolved', { providerName });

  // Validate provider name
  const validProviders = ['openai', 'gemini', 'ollama'];
  if (!validProviders.includes(providerName.toLowerCase())) {
    const error = new Error(`Unknown LLM provider: ${providerName}. Valid providers: ${validProviders.join(', ')}`);
    logger.error('LLM: Invalid provider', { providerName, validProviders });
    throw error;
  }

  const providerConfig = {
    apiKey: config.apiKey || getApiKey(providerName),
    model: config.model || process.env.LLM_MODEL,
    ...config
  };

  logger.debug('LLM: Provider configuration', {
    provider: providerName,
    model: providerConfig.model,
    hasApiKey: !!providerConfig.apiKey,
    temperature: providerConfig.temperature,
    maxTokens: providerConfig.maxTokens
  });

  let provider;
  switch (providerName.toLowerCase()) {
    case 'openai':
      logger.info('LLM: Creating OpenAI provider');
      provider = createOpenAIProvider(providerConfig);
      break;
    case 'gemini':
      logger.info('LLM: Creating Gemini provider');
      provider = createGeminiProvider(providerConfig);
      break;
    case 'ollama':
      logger.info('LLM: Creating Ollama provider');
      provider = createOllamaProvider(providerConfig);
      break;
    default:
      throw new Error(`Unknown LLM provider: ${providerName}`);
  }

  logger.debug('LLM: Provider created', {
    name: provider.name,
    model: provider.model
  });

  return provider;
};

/**
 * Factory function to create LLM client
 * @param {Object} config - Configuration object
 * @returns {Object} LLM client with provider info and complete method
 */
const createLLMClient = (config = {}) => {
  logger.debug('LLM: Creating LLM client', { config });
  
  const provider = selectProvider(config);
  
  const client = {
    provider: provider.name,
    model: provider.model,
    complete: withRetry(config.retry || {}, provider.complete)
  };
  
  logger.info('LLM: Client created successfully', {
    provider: client.provider,
    model: client.model,
    hasRetry: !!config.retry
  });
  
  return client;
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
