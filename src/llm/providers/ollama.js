const axios = require('axios');
const { curry, memoizeWith, identity } = require('ramda');
const { LLMProviderError } = require('../../utils/errors');

/**
 * Get memoized Ollama client
 * @param {string} baseURL - Base URL for Ollama
 * @returns {Object} Axios client instance
 */
const getOllamaClient = memoizeWith(identity, baseURL => axios.create({
  baseURL: baseURL || 'http://localhost:11434',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
}));

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

  // Get memoized client
  const client = getOllamaClient(baseURL);

  return {
    name: 'ollama',
    model,
    complete: createOllamaComplete(client, { model, temperature, maxTokens })
  };
};

/**
 * Create Ollama complete function
 * @param {Object} client - Axios client instance
 * @param {Object} defaults - Default options
 * @returns {Function} Complete function
 */
const createOllamaComplete = curry(async (client, defaults, options) => {
  try {
    // Build prompt with system message if provided
    let prompt = options.user;
    if (options.system) {
      prompt = `System: ${options.system}\n\nUser: ${options.user}`;
    }

    const requestData = {
      model: options.model || defaults.model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
        num_predict: options.maxTokens || defaults.maxTokens,
        top_p: options.topP,
        top_k: options.topK,
        seed: options.seed,
        repeat_penalty: options.repeatPenalty
      }
    };

    const response = await client.post('/api/generate', requestData);

    if (!response.data || !response.data.response) {
      throw new Error('Invalid response from Ollama');
    }

    return response.data.response;
  } catch (error) {
    let message = `Ollama API error: ${error.message}`;

    if (error.code === 'ECONNREFUSED') {
      message = 'Ollama server is not running. Please start Ollama locally.';
    }

    throw new LLMProviderError(message, 'ollama', error);
  }
});

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
