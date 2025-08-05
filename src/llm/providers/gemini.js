const { GoogleGenerativeAI } = require('@google/generative-ai');
const { curry } = require('ramda');
const { LLMProviderError } = require('../../utils/errors');

/**
 * Create Google Gemini provider
 * @param {Object} config - Configuration object
 * @returns {Object} Gemini provider instance
 */
const createGeminiProvider = (config = {}) => {
  if (!config.apiKey) {
    throw new Error('Google Gemini API key is required');
  }

  const genAI = new GoogleGenerativeAI(config.apiKey);

  const model = config.model || 'gemini-pro';
  const temperature = config.temperature || 0.7;
  const maxTokens = config.maxTokens || 2000;

  return {
    name: 'gemini',
    model,
    complete: createGeminiComplete(genAI, { model, temperature, maxTokens })
  };
};

/**
 * Create Gemini complete function
 * @param {Object} genAI - Google GenerativeAI instance
 * @param {Object} defaults - Default options
 * @returns {Function} Complete function
 */
const createGeminiComplete = curry(async (genAI, defaults, options) => {
  try {
    const model = genAI.getGenerativeModel({
      model: options.model || defaults.model
    });

    // Build prompt with system message if provided
    let prompt = options.user;
    if (options.system) {
      prompt = `${options.system}\n\n${options.user}`;
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

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings
    });

    const { response } = result;

    // Check for safety or other finish reasons
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Response blocked: ${candidate.finishReason}`);
      }
    }

    const text = response.text();

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    return text;
  } catch (error) {
    throw new LLMProviderError(
      `Gemini API error: ${error.message}`,
      'gemini',
      error
    );
  }
});

module.exports = {
  createGeminiProvider
};
