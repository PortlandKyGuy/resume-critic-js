const { GoogleGenerativeAI } = require('@google/generative-ai');
const { LLMProviderError } = require('../../utils/errors');
const { logger } = require('../../utils/logger');

/**
 * Create Gemini complete function
 * @param {Object} genAI - Google GenerativeAI instance
 * @param {Object} defaults - Default options
 * @returns {Function} Complete function
 */
const createGeminiComplete = (genAI, defaults) => {
  // Return a function that captures genAI and defaults in its closure
  return async (options) => {
    const startTime = Date.now();

    logger.debug('Gemini: Starting completion request', {
      hasSystem: !!options.system,
      userPromptLength: options.user?.length,
      temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
      model: options.model || defaults.model
    });

    try {
      const model = genAI.getGenerativeModel({
        model: options.model || defaults.model
      });

      // Build prompt with system message if provided
      const prompt = options.system
        ? `${options.system}\n\n${options.user}`
        : options.user;

      if (options.system) {
        logger.debug('Gemini: Combined system and user prompts', {
          combinedLength: prompt.length
        });
      }

      // Configure generation settings
      const generationConfig = {
        temperature: options.temperature !== undefined ? options.temperature : defaults.temperature,
        maxOutputTokens: options.maxTokens || defaults.maxTokens,
        topP: options.topP,
        topK: options.topK,
        candidateCount: 1
      };

      // Add safety settings if needed
      const safetySettings = options.safetySettings || [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_NONE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE'
        }
      ];

      logger.debug('Gemini: Sending request', {
        model: options.model || defaults.model,
        promptLength: prompt.length,
        maxOutputTokens: generationConfig.maxOutputTokens,
        temperature: generationConfig.temperature,
        hasOptionalParams: !!(options.topP || options.topK),
        safetyThreshold: safetySettings[0]?.threshold
      });

      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings
      });

      const { response } = result;

      // Check for safety or other finish reasons
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];

        logger.debug('Gemini: Response candidate info', {
          finishReason: candidate.finishReason,
          safetyRatings: candidate.safetyRatings
        });

        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
          logger.warn('Gemini: Response blocked', {
            finishReason: candidate.finishReason,
            safetyRatings: candidate.safetyRatings
          });
          throw new Error(`Response blocked: ${candidate.finishReason}`);
        }
      }

      const text = response.text();
      const duration = Date.now() - startTime;

      if (!text) {
        logger.error('Gemini: Empty response received', { duration });
        throw new Error('Empty response from Gemini');
      }

      logger.info('Gemini: Completion successful', {
        duration,
        responseLength: text.length,
        finishReason: response.candidates?.[0]?.finishReason
      });

      logger.debug('Gemini: Response preview', {
        preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });

      return text;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Gemini: Request failed', {
        duration,
        errorMessage: error.message,
        errorCode: error.code,
        model: options.model || defaults.model
      });

      throw new LLMProviderError(
        `Gemini API error: ${error.message}`,
        'gemini',
        error
      );
    }
  };
};

/**
 * Create Google Gemini provider
 * @param {Object} config - Configuration object
 * @returns {Object} Gemini provider instance
 */
const createGeminiProvider = (config = {}) => {
  logger.debug('Gemini: Creating provider', {
    hasApiKey: !!config.apiKey,
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens
  });

  if (!config.apiKey) {
    logger.error('Gemini: API key missing');
    throw new Error('Google Gemini API key is required');
  }

  const genAI = new GoogleGenerativeAI(config.apiKey);

  const model = config.model || 'gemini-pro';
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2000;

  logger.info('Gemini: Provider initialized', { model, temperature, maxTokens });

  return {
    name: 'gemini',
    model,
    complete: createGeminiComplete(genAI, { model, temperature, maxTokens })
  };
};

module.exports = {
  createGeminiProvider
};
