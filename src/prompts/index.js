/**
 * @module prompts
 * @description Main entry point for the prompt management system
 */

const template = require('./template');
const base = require('./base');
const composer = require('./composer');
const schema = require('./schema');
const industry = require('./industry');
const critics = require('./critics');
const utils = require('./utils');
const version = require('./version');

/**
 * High-level prompt generation function
 * @param {Object} options - Prompt generation options
 * @returns {Object} Generated prompt with system, user, and schema
 */
const generatePrompt = options => {
  const { promptVersion = 'latest' } = options;

  // Generate base prompt
  const basePrompt = composer.composePrompt(options);

  // Apply version modifications
  const versionedPrompt = version.applyVersion(promptVersion, basePrompt);

  // Optimize for token limits
  const optimizedPrompt = utils.optimizePromptTokens(versionedPrompt);

  return optimizedPrompt;
};

/**
 * Generate prompt for specific critics
 * @param {Array<string>} criticNames - Critics to include
 * @param {Object} options - Generation options
 * @returns {Object} Generated prompt
 */
const generateCriticPrompt = (criticNames, options) => generatePrompt({
  ...options,
  enabledCritics: criticNames
});

/**
 * Generate industry-specific prompt
 * @param {string} industryName - Industry name
 * @param {Object} options - Generation options
 * @returns {Object} Generated prompt
 */
const generateIndustryPrompt = (industryName, options) => generatePrompt({
  ...options,
  industry: industryName
});

module.exports = {
  // Template engine
  template,

  // Base prompts and components
  base,

  // Prompt composition
  composer,

  // Schema generation
  schema,

  // Industry context
  industry,

  // Critic-specific prompts
  critics,

  // Utilities
  utils,

  // Version management
  version,

  // High-level API
  generatePrompt,
  generateCriticPrompt,
  generateIndustryPrompt,

  // Re-export commonly used functions
  composePrompt: composer.composePrompt,
  validatePrompt: utils.validatePrompt,
  generateSchema: schema.generateSchema,
  enrichIndustryContext: industry.enrichIndustryContext,

  // Constants
  SYSTEM_PROMPT: base.SYSTEM_PROMPT,
  OUTPUT_SCHEMA: base.OUTPUT_SCHEMA,
  ALL_CRITICS: critics.getAllCriticNames()
};
