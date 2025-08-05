const OpenAI = require('openai');
const { curry } = require('ramda');
const { LLMProviderError } = require('../../utils/errors');

/**
 * Create OpenAI provider
 * @param {Object} config - Configuration object
 * @returns {Object} OpenAI provider instance
 */
const createOpenAIProvider = (config = {}) => {
  if (!config.apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const client = new OpenAI({
    apiKey: config.apiKey
  });

  const model = config.model || 'gpt-3.5-turbo';
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2000;

  return {
    name: 'openai',
    model,
    complete: createOpenAIComplete(client, { model, temperature, maxTokens })
  };
};

/**
 * Create OpenAI complete function
 * @param {Object} client - OpenAI client instance
 * @param {Object} defaults - Default options
 * @returns {Function} Complete function
 */
const createOpenAIComplete = curry(async (client, defaults, options) => {
  try {
    const messages = [];

    if (options.system) {
      messages.push({
        role: 'system',
        content: options.system
      });
    }

    messages.push({
      role: 'user',
      content: options.user
    });

    const completionOptions = {
      model: options.model || defaults.model,
      messages,
      temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
      max_tokens: options.maxTokens || defaults.maxTokens
    };

    // Only add optional parameters if they are explicitly provided
    if (options.responseFormat !== undefined) {
      completionOptions.response_format = options.responseFormat;
    }
    if (options.seed !== undefined) {
      completionOptions.seed = options.seed;
    }
    if (options.topP !== undefined) {
      completionOptions.top_p = options.topP;
    }
    if (options.frequencyPenalty !== undefined) {
      completionOptions.frequency_penalty = options.frequencyPenalty;
    }
    if (options.presencePenalty !== undefined) {
      completionOptions.presence_penalty = options.presencePenalty;
    }

    const response = await client.chat.completions.create(completionOptions);

    return response.choices[0].message.content;
  } catch (error) {
    throw new LLMProviderError(
      `OpenAI API error: ${error.message}`,
      'openai',
      error
    );
  }
});

module.exports = {
  createOpenAIProvider
};
