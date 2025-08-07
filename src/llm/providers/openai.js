const OpenAI = require('openai');
const { LLMProviderError } = require('../../utils/errors');
const { logger } = require('../../utils/logger');

/**
 * Create OpenAI complete function
 * @param {Object} client - OpenAI client instance
 * @param {Object} defaults - Default options
 * @returns {Function} Complete function
 */
const createOpenAIComplete = (client, defaults) => async options => {
  // Return a function that captures client and defaults in its closure
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
    const optionalParams = [
      { condition: options.responseFormat !== undefined, key: 'response_format', value: options.responseFormat },
      { condition: options.seed !== undefined, key: 'seed', value: options.seed },
      { condition: options.topP !== undefined, key: 'top_p', value: options.topP },
      {
        condition: options.frequencyPenalty !== undefined,
        key: 'frequency_penalty',
        value: options.frequencyPenalty
      },
      { condition: options.presencePenalty !== undefined, key: 'presence_penalty', value: options.presencePenalty }
    ].filter(param => param.condition)
      .reduce((acc, param) => ({ ...acc, [param.key]: param.value }), {});

    const finalCompletionOptions = { ...completionOptions, ...optionalParams };

    logger.debug('OpenAI: Sending request', {
      model: finalCompletionOptions.model,
      messageCount: messages.length,
      maxTokens: finalCompletionOptions.max_tokens,
      temperature: finalCompletionOptions.temperature,
      messages: messages.map(m => ({
        role: m.role,
        contentLength: m.content.length,
        contentPreview: m.content.substring(0, 200) + (m.content.length > 200 ? '...' : '')
      })),
      hasOptionalParams: !!(options.responseFormat || options.seed || options.topP
        || options.frequencyPenalty || options.presencePenalty)
    });

    const response = await client.chat.completions.create(finalCompletionOptions);

    const duration = Date.now() - startTime;
    const { content } = response.choices[0].message;

    logger.debug('OpenAI: Received response', {
      responseLength: content.length,
      responsePreview: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
      finishReason: response.choices[0].finish_reason
    });

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
      preview: content ? content.substring(0, 100) + (content.length > 100 ? '...' : '') : ''
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
};

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

module.exports = {
  createOpenAIProvider
};
