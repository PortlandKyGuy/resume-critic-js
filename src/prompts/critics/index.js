/**
 * @module prompts/critics
 * @description Central export for all critic prompt generators
 */

const keyword = require('./keyword');
const experience = require('./experience');
const impact = require('./impact');
const readability = require('./readability');
const completeness = require('./completeness');
const relevance = require('./relevance');
const requirements = require('./requirements');

/**
 * All available critics
 */
const CRITICS = {
  keyword: keyword.KEYWORD_CRITIC,
  experience: experience.EXPERIENCE_CRITIC,
  impact: impact.IMPACT_CRITIC,
  readability: readability.READABILITY_CRITIC,
  completeness: completeness.COMPLETENESS_CRITIC,
  relevance: relevance.RELEVANCE_CRITIC,
  requirements: requirements.REQUIREMENTS_CRITIC
};

/**
 * Critic prompt generators
 */
const CRITIC_GENERATORS = {
  keyword: keyword.generateKeywordAnalysisPrompt,
  experience: experience.generateExperienceAnalysisPrompt,
  impact: impact.generateImpactAnalysisPrompt,
  readability: readability.generateReadabilityAnalysisPrompt,
  completeness: completeness.generateCompletenessAnalysisPrompt,
  relevance: relevance.generateRelevanceAnalysisPrompt,
  requirements: requirements.generateRequirementsAnalysisPrompt
};

/**
 * Critic improvement generators
 */
const IMPROVEMENT_GENERATORS = {
  keyword: keyword.generateKeywordImprovements,
  experience: experience.generateExperienceImprovements,
  impact: impact.generateImpactImprovements,
  readability: readability.generateReadabilityImprovements,
  completeness: completeness.generateCompletenessImprovements,
  relevance: relevance.generateRelevanceImprovements,
  requirements: requirements.generateRequirementsImprovements
};

module.exports = {
  // Individual critic modules
  keyword,
  experience,
  impact,
  readability,
  completeness,
  relevance,
  requirements,

  // Aggregated exports
  CRITICS,
  CRITIC_GENERATORS,
  IMPROVEMENT_GENERATORS,

  // Utility function to get all critic names
  getAllCriticNames: () => Object.keys(CRITICS),

  // Get specific critic configuration
  getCriticConfig: name => CRITICS[name],

  // Get specific generator
  getCriticGenerator: name => CRITIC_GENERATORS[name],

  // Get improvement generator
  getImprovementGenerator: name => IMPROVEMENT_GENERATORS[name]
};
