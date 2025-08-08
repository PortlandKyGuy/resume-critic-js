const axios = require('axios');
const { LLMProviderError } = require('../../utils/errors');
const { logger } = require('../../utils/logger');

// Simple memoization cache for clients
const clientCache = new Map();

/**
 * Get memoized Ollama client
 * @param {string} baseURL - Base URL for Ollama
 * @returns {Object} Axios client instance
 */
const getOllamaClient = baseURL => {
  const url = baseURL || 'http://localhost:11434';

  // Check if client already exists in cache
  if (clientCache.has(url)) {
    return clientCache.get(url);
  }

  logger.debug('Ollama: Creating axios client', { baseURL: url });

  const client = axios.create({
    baseURL: url,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Store in cache
  clientCache.set(url, client);

  return client;
};

/**
 * Create Ollama complete function
 * @param {Object} client - Axios client instance
 * @param {Object} defaults - Default options
 * @returns {Function} Complete function
 */
const createOllamaComplete = (client, defaults) => async options => {
  // Return a function that captures client and defaults in its closure
  const startTime = Date.now();

  logger.debug('Ollama: Starting completion request', {
    hasSystem: !!options.system,
    userPromptLength: options.user?.length,
    temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
    model: options.model || defaults.model
  });

  try {
    // Build prompt with system message if provided
    const prompt = options.system
      ? `System: ${options.system}\n\nUser: ${options.user}`
      : options.user;

    if (options.system) {
      logger.debug('Ollama: Combined system and user prompts', {
        combinedLength: prompt.length
      });
    }

    const requestData = {
      model: options.model || defaults.model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
        num_predict: options.maxTokens || defaults.maxTokens
      }
    };

    // Only add optional parameters if they are provided
    if (options.topP !== undefined) requestData.options.top_p = options.topP;
    if (options.topK !== undefined) requestData.options.top_k = options.topK;
    if (options.seed !== undefined) requestData.options.seed = options.seed;
    if (options.repeatPenalty !== undefined) requestData.options.repeat_penalty = options.repeatPenalty;

    logger.debug('Ollama: Sending request', {
      model: requestData.model,
      promptLength: prompt.length,
      numPredict: requestData.options.num_predict,
      temperature: requestData.options.temperature,
      hasOptionalParams: !!(options.topP || options.topK || options.seed || options.repeatPenalty)
    });

    const response = await client.post('/api/generate', requestData);

    const duration = Date.now() - startTime;

    if (!response.data || !response.data.response) {
      logger.error('Ollama: Invalid response structure', {
        duration,
        hasData: !!response.data,
        hasResponse: !!response.data?.response
      });
      throw new Error('Invalid response from Ollama');
    }

    const text = response.data.response;

    logger.info('Ollama: Completion successful', {
      duration,
      responseLength: text.length,
      model: response.data.model,
      evalCount: response.data.eval_count,
      evalDuration: response.data.eval_duration,
      promptEvalCount: response.data.prompt_eval_count,
      promptEvalDuration: response.data.prompt_eval_duration,
      tokensPerSecond: response.data.eval_count && response.data.eval_duration
        ? Math.round(response.data.eval_count / (response.data.eval_duration / 1e9))
        : undefined
    });

    logger.debug('Ollama: Response preview', {
      preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });

    return text;
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error.code === 'ECONNREFUSED'
      ? 'Ollama server is not running. Please start Ollama locally.'
      : `Ollama API error: ${error.message}`;

    if (error.code === 'ECONNREFUSED') {
      logger.error('Ollama: Connection refused', {
        duration,
        baseURL: client.defaults.baseURL,
        suggestion: 'Run "ollama serve" to start the Ollama server'
      });
    } else {
      logger.error('Ollama: Request failed', {
        duration,
        errorMessage: error.message,
        errorCode: error.code,
        statusCode: error.response?.status,
        model: options.model || defaults.model
      });
    }

    throw new LLMProviderError(message, 'ollama', error);
  }
};

/**
 * Create Ollama provider for local LLM
 * @param {Object} config - Configuration object
 * @returns {Object} Ollama provider instance
 */
const createOllamaProvider = (config = {}) => {
  const baseURL = config.baseURL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = config.model || 'llama2';
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2000;

  logger.debug('Ollama: Creating provider', {
    baseURL,
    model,
    temperature,
    maxTokens
  });

  // Get memoized client
  const client = getOllamaClient(baseURL);

  logger.info('Ollama: Provider initialized', { baseURL, model, temperature, maxTokens });

  return {
    name: 'ollama',
    model,
    complete: createOllamaComplete(client, { model, temperature, maxTokens })
  };
};

/**
 * Check if Ollama is available
 * @param {string} baseURL - Ollama base URL
 * @returns {Promise<boolean>} True if Ollama is available
 */
const checkOllamaAvailability = async baseURL => {
  try {
    const client = getOllamaClient(baseURL || 'http://localhost:11434');
    const response = await client.get('/api/tags');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * List available Ollama models
 * @param {string} baseURL - Ollama base URL
 * @returns {Promise<Array>} List of available models
 */
const listOllamaModels = async baseURL => {
  try {
    const client = getOllamaClient(baseURL || 'http://localhost:11434');
    const response = await client.get('/api/tags');
    return response.data.models || [];
  } catch (error) {
    throw new LLMProviderError(
      `Failed to list Ollama models: ${error.message}`,
      'ollama',
      error
    );
  }
};

module.exports = {
  createOllamaProvider,
  checkOllamaAvailability,
  listOllamaModels
};
