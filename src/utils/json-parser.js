const { logger } = require('./logger');

/**
 * Parse JSON response from LLM, handling common issues
 * @param {string} response - Raw response from LLM
 * @returns {Object|null} Parsed JSON object or null on failure
 */
const parseJsonResponse = response => {
  try {
    // First try direct parsing
    return JSON.parse(response);
  } catch (firstError) {
    try {
      // Clean the response
      const cleaned = response
        .trim()
        // Remove markdown code blocks
        .replace(/^```(?:json)?\s*\n?/, '')
        .replace(/\n?```\s*$/, '')
        // Remove single-line comments
        .replace(/\/\/.*$/gm, '')
        // Remove multi-line comments
        .replace(/\/\*[\s\S]*?\*\//g, '')
        // Remove trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Trim whitespace
        .trim();

      return JSON.parse(cleaned);
    } catch (secondError) {
      logger.error('Failed to parse JSON response after cleaning', {
        originalError: firstError.message,
        cleaningError: secondError.message,
        responsePreview: response.substring(0, 200)
      });
      return null;
    }
  }
};

module.exports = { parseJsonResponse };
