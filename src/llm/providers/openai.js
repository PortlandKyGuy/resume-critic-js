const OpenAI = require('openai');
const { curry } = require('ramda');
const { LLMProviderError } = require('../../utils/errors');
const { logger } = require('../../utils/logger');

/**
 * Create OpenAI provider
 * @param {Object} config - Configuration object
 * @returns {Object} OpenAI provider instance
 */
const createOpenAIProvider = (config = {}) => {
  logger.debug('OpenAI: Creating provider', {
    hasApiKey: !!config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });

  if (!config.apiKey) {
    logger.error('OpenAI: API key missing');
    throw new Error('OpenAI API key is required');
  }

  const client = new OpenAI({
    apiKey: config.apiKey
  });

  const model = config.model || 'gpt-3.5-turbo';
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2000;

  logger.info('OpenAI: Provider initialized', { model, temperature, maxTokens });

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
  const startTime = Date.now();
  
  logger.debug('OpenAI: Starting completion request', {
    hasSystem: !!options.system,
    userPromptLength: options.user?.length,
    temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
    model: options.model || defaults.model
  });

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

    logger.debug('OpenAI: Sending request', {
      model: completionOptions.model,
      messageCount: messages.length,
      maxTokens: completionOptions.max_tokens,
      temperature: completionOptions.temperature,
      hasOptionalParams: !!(options.responseFormat || options.seed || options.topP || 
                           options.frequencyPenalty || options.presencePenalty)
    });

    const response = await client.chat.completions.create(completionOptions);

    const duration = Date.now() - startTime;
    const content = response.choices[0].message.content;

    logger.info('OpenAI: Completion successful', {
      duration,
      model: response.model,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      responseLength: content?.length,
      finishReason: response.choices[0].finish_reason
    });

    logger.debug('OpenAI: Response preview', {
      preview: content?.substring(0, 100) + (content?.length > 100 ? '...' : '')
    });

    return content;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('OpenAI: Request failed', {
      duration,
      errorMessage: error.message,
      errorType: error.type,
      errorCode: error.code,
      statusCode: error.response?.status,
      model: options.model || defaults.model
    });

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
