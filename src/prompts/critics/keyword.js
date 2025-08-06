/**
 * @module prompts/critics/keyword
 * @description Keyword optimization critic prompt generator
 */

const { curry, pipe, map, filter, includes, toLower } = require('ramda');

/**
 * Keyword critic configuration
 */
const KEYWORD_CRITIC = {
  name: 'keyword',
  displayName: 'Keyword Optimization',
  description: 'Evaluates ATS compatibility and keyword optimization',

  criteria: {
    primary: [
      'Presence of role-specific keywords',
      'Natural keyword integration',
      'ATS-friendly formatting',
      'Action verb usage',
      'Industry terminology'
    ],
    secondary: [
      'Keyword density balance',
      'Synonym usage',
      'Technical term accuracy',
      'Buzzword avoidance'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'Exceptional keyword usage with perfect ATS optimization'
    },
    good: {
      range: [70, 89],
      description: 'Strong keywords present, minor improvements possible'
    },
    adequate: {
      range: [50, 69],
      description: 'Basic keywords present but missing important terms'
    },
    poor: {
      range: [30, 49],
      description: 'Weak keyword usage, needs significant improvement'
    },
    failing: {
      range: [0, 29],
      description: 'Severely lacking relevant keywords'
    }
  },

  prompts: {
    analysis: `Analyze the keyword optimization of this resume:
1. Identify role-specific keywords and technical terms
2. Evaluate natural integration vs keyword stuffing
3. Check for ATS-friendly formatting
4. Assess action verb usage
5. Review industry terminology accuracy`,

    scoring: `Score the keyword optimization from 0-100 based on:
- 40%: Presence of job-relevant keywords
- 20%: Natural integration without stuffing
- 20%: ATS compatibility
- 10%: Action verb variety
- 10%: Industry-specific terminology`
  }
};

/**
 * Generate keyword analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateKeywordAnalysisPrompt = curry(context => {
  const { jobRequirements = [], industry } = context;

  const promptParts = [KEYWORD_CRITIC.prompts.analysis];

  if (jobRequirements.length > 0) {
    promptParts.push('\n\nRequired keywords from job description:\n');
    promptParts.push(jobRequirements.map(req => `- ${req}`).join('\n'));
  }

  if (industry && industry !== 'general') {
    promptParts.push(`\n\nIndustry-specific terms to look for (${industry}):`);
    promptParts.push('\n- Technical skills and tools commonly used');
    promptParts.push('\n- Industry certifications and standards');
    promptParts.push('\n- Domain-specific methodologies');
  }

  return promptParts.join('');
});

/**
 * Extract keywords from text
 * @param {string} text - Text to analyze
 * @returns {Array<string>} Extracted keywords
 */
const extractKeywords = curry(text => {
  // Simple keyword extraction - in production, use NLP library
  const words = text.toLowerCase().split(/\W+/);
  const stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'
  ];

  return pipe(
    filter(word => word.length > 3),
    filter(word => !includes(word, stopWords))
  )(words);
});

/**
 * Generate improvement suggestions for keywords
 * @param {Object} evaluation - Keyword evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateKeywordImprovements = curry(evaluation => {
  const improvements = [];
  const { score, missingKeywords = [], keywordDensity = 'normal' } = evaluation;

  if (missingKeywords.length > 0) {
    improvements.push(`Add missing keywords: ${missingKeywords.slice(0, 3).join(', ')}`);
  }

  if (keywordDensity === 'low') {
    improvements.push('Increase keyword frequency in relevant contexts');
  } else if (keywordDensity === 'high') {
    improvements.push('Reduce keyword repetition to avoid stuffing');
  }

  if (score < 70) {
    improvements.push('Use more action verbs at the beginning of bullet points');
    improvements.push('Include industry-specific technical terms');
  }

  if (improvements.length === 0) {
    improvements.push('Consider adding emerging industry keywords');
    improvements.push('Ensure all technical skills are ATS-parseable');
  }

  return improvements;
});

/**
 * Calculate keyword match score
 * @param {Array<string>} requiredKeywords - Required keywords
 * @param {Array<string>} resumeKeywords - Keywords found in resume
 * @returns {number} Match percentage
 */
const calculateKeywordMatch = curry((requiredKeywords, resumeKeywords) => {
  if (requiredKeywords.length === 0) return 80; // Default score when no requirements

  const resumeKeywordsLower = map(toLower, resumeKeywords);
  const matches = filter(
    keyword => includes(toLower(keyword), resumeKeywordsLower),
    requiredKeywords
  );

  return Math.round((matches.length / requiredKeywords.length) * 100);
});

module.exports = {
  KEYWORD_CRITIC,
  generateKeywordAnalysisPrompt,
  extractKeywords,
  generateKeywordImprovements,
  calculateKeywordMatch
};
