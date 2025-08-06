/**
 * @module prompts/utils
 * @description Utility functions for prompt management and optimization
 */

const { curry, pipe, reduce, split } = require('ramda');
const { memoize } = require('../utils/functional');
const { logger } = require('../utils/logger');

/**
 * Token estimation constants
 * Based on OpenAI's approximation: ~4 characters per token
 */
const CHARS_PER_TOKEN = 4;
const MAX_TOKENS = {
  gpt35: 4096,
  gpt4: 8192,
  claude: 100000,
  gemini: 32000,
  default: 4096
};

/**
 * Estimate token count for text
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
const estimateTokens = curry(text => {
  if (!text) return 0;
  // Simple estimation - in production, use tiktoken or similar
  return Math.ceil(text.length / CHARS_PER_TOKEN);
});

/**
 * Truncate text to fit within token limit
 * @param {number} maxTokens - Maximum tokens allowed
 * @param {string} text - Text to truncate
 * @returns {string} Truncated text
 */
const truncateToTokenLimit = curry((maxTokens, text) => {
  const estimatedTokens = estimateTokens(text);

  if (estimatedTokens <= maxTokens) {
    return text;
  }

  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const truncated = text.slice(0, maxChars - 20); // Leave room for ellipsis
  return `${truncated}\n\n[Content truncated...]`;
});

/**
 * Optimize prompt for token efficiency
 * @param {Object} prompt - Prompt object with system and user parts
 * @returns {Object} Optimized prompt
 */
const optimizePromptTokens = curry(prompt => {
  const { system, user, maxTokens = MAX_TOKENS.default } = prompt;

  // Reserve tokens for response
  const promptMaxTokens = Math.floor(maxTokens * 0.6);

  // Estimate current usage
  const systemTokens = estimateTokens(system);
  const userTokens = estimateTokens(user);
  const totalTokens = systemTokens + userTokens;

  if (totalTokens <= promptMaxTokens) {
    return prompt;
  }

  // Truncate user prompt if needed (preserve system prompt)
  const availableUserTokens = promptMaxTokens - systemTokens;
  const optimizedUser = truncateToTokenLimit(availableUserTokens, user);

  logger.warn('Prompt truncated for token limit', {
    original: totalTokens,
    optimized: systemTokens + estimateTokens(optimizedUser),
    maxAllowed: promptMaxTokens
  });

  return {
    ...prompt,
    user: optimizedUser,
    wasOptimized: true
  };
});

/**
 * Sanitize text for LLM input
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
const sanitizeForLLM = curry(text => {
  if (!text) return '';

  return pipe(
    // Remove potential injection attempts
    t => t.replace(/\{\{.*?\}\}/g, '[TEMPLATE_REMOVED]'),
    // Remove control characters
    // eslint-disable-next-line no-control-regex
    t => t.replace(/[\u0000-\u001F\u007F]/g, ' '),
    // Normalize whitespace
    t => t.replace(/\s+/g, ' '),
    // Trim
    t => t.trim()
  )(text);
});

/**
 * Validate prompt structure
 * @param {Object} prompt - Prompt to validate
 * @returns {Object} Validation result
 */
const validatePrompt = curry(prompt => {
  const errors = [];

  if (!prompt.system || typeof prompt.system !== 'string') {
    errors.push('System prompt is required and must be a string');
  }

  if (!prompt.user || typeof prompt.user !== 'string') {
    errors.push('User prompt is required and must be a string');
  }

  if (prompt.system && prompt.system.length < 10) {
    errors.push('System prompt is too short');
  }

  if (prompt.user && prompt.user.length < 10) {
    errors.push('User prompt is too short');
  }

  const totalTokens = estimateTokens((prompt.system || '') + (prompt.user || ''));
  if (totalTokens > MAX_TOKENS.default * 0.8) {
    errors.push('Prompt may be too long for some providers');
  }

  return {
    valid: errors.length === 0,
    errors,
    tokenCount: totalTokens
  };
});

/**
 * Create prompt debug info
 * @param {Object} prompt - Prompt to debug
 * @returns {Object} Debug information
 */
const createPromptDebugInfo = curry(prompt => {
  const systemTokens = estimateTokens(prompt.system || '');
  const userTokens = estimateTokens(prompt.user || '');

  return {
    systemTokens,
    userTokens,
    totalTokens: systemTokens + userTokens,
    systemLength: (prompt.system || '').length,
    userLength: (prompt.user || '').length,
    hasSchema: !!prompt.schema,
    schemaProperties: prompt.schema ? Object.keys(prompt.schema.properties || {}) : [],
    metadata: prompt.metadata || {}
  };
});

/**
 * Format prompt for display/logging
 * @param {Object} prompt - Prompt to format
 * @returns {string} Formatted prompt
 */
const formatPromptForDisplay = curry(prompt => {
  const lines = [
    '=== SYSTEM PROMPT ===',
    prompt.system || '[No system prompt]',
    '',
    '=== USER PROMPT ===',
    prompt.user || '[No user prompt]',
    ''
  ];

  if (prompt.schema) {
    lines.push('=== EXPECTED SCHEMA ===');
    lines.push(JSON.stringify(prompt.schema, null, 2));
    lines.push('');
  }

  if (prompt.metadata) {
    lines.push('=== METADATA ===');
    lines.push(JSON.stringify(prompt.metadata, null, 2));
  }

  return lines.join('\n');
});

/**
 * Chunk large content for batch processing
 * @param {number} chunkSize - Maximum chunk size in characters
 * @param {string} content - Content to chunk
 * @returns {Array<string>} Content chunks
 */
const chunkContent = curry((chunkSize, content) => {
  if (!content || content.length <= chunkSize) {
    return [content];
  }

  const sentences = split(/(?<=[.!?])\s+/, content);
  const processedChunks = sentences.reduce((acc, sentence) => {
    const { chunks: currentChunks, currentChunk } = acc;
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      return {
        chunks: [...currentChunks, currentChunk.trim()],
        currentChunk: sentence
      };
    }
    return {
      chunks: currentChunks,
      currentChunk: currentChunk + (currentChunk ? ' ' : '') + sentence
    };
  }, { chunks: [], currentChunk: '' });

  if (processedChunks.currentChunk) {
    return [...processedChunks.chunks, processedChunks.currentChunk.trim()];
  }

  return processedChunks.chunks;
});

/**
 * Merge prompt responses
 * @param {Array<Object>} responses - Array of LLM responses
 * @returns {Object} Merged response
 */
const mergePromptResponses = curry(responses => {
  if (!responses || responses.length === 0) {
    return null;
  }

  if (responses.length === 1) {
    return responses[0];
  }

  // Merge evaluations arrays
  const allEvaluations = reduce((acc, resp) => [...acc, ...(resp.evaluations || [])], [], responses);

  // Calculate overall score as average
  const overallScore = reduce((sum, resp) => sum + (resp.overall_score || 0), 0, responses) / responses.length;

  // Merge other fields
  return {
    evaluations: allEvaluations,
    overall_score: Math.round(overallScore),
    summary: responses[0].summary, // Use first summary
    top_strengths: responses[0].top_strengths,
    critical_improvements: responses[0].critical_improvements
  };
});

/**
 * Cache key generator for prompts
 * @param {Object} prompt - Prompt object
 * @returns {string} Cache key
 */
const generatePromptCacheKey = curry(prompt => {
  const components = [
    prompt.system ? prompt.system.slice(0, 50) : '',
    prompt.user ? prompt.user.slice(0, 50) : '',
    JSON.stringify(prompt.metadata || {})
  ];

  // Simple hash - in production, use crypto
  return components.join('|').replace(/\s+/g, '_').slice(0, 100);
});

/**
 * Memoized utility functions
 */
const memoizedEstimateTokens = memoize(estimateTokens);
const memoizedSanitizeForLLM = memoize(sanitizeForLLM);

module.exports = {
  // Constants
  CHARS_PER_TOKEN,
  MAX_TOKENS,

  // Token management
  estimateTokens: memoizedEstimateTokens,
  truncateToTokenLimit,
  optimizePromptTokens,

  // Sanitization and validation
  sanitizeForLLM: memoizedSanitizeForLLM,
  validatePrompt,

  // Debug and display
  createPromptDebugInfo,
  formatPromptForDisplay,

  // Batch processing
  chunkContent,
  mergePromptResponses,

  // Caching
  generatePromptCacheKey
};
