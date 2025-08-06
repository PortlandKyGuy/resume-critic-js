/**
 * @module prompts/critics/impact
 * @description Impact demonstration critic prompt generator
 */

const { curry, test } = require('ramda');

/**
 * Impact critic configuration
 */
const IMPACT_CRITIC = {
  name: 'impact',
  displayName: 'Impact Demonstration',
  description: 'Evaluates quantifiable achievements and business impact',

  criteria: {
    primary: [
      'Quantifiable metrics',
      'Business value delivered',
      'Problem-solving examples',
      'Innovation initiatives',
      'Cost/time savings'
    ],
    secondary: [
      'Team achievements',
      'Process improvements',
      'Customer satisfaction',
      'Revenue generation'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'Outstanding impact with comprehensive metrics and clear ROI'
    },
    good: {
      range: [70, 89],
      description: 'Good impact statements with some quantification'
    },
    adequate: {
      range: [50, 69],
      description: 'Shows impact but lacks consistent quantification'
    },
    poor: {
      range: [30, 49],
      description: 'Limited impact demonstration, mostly responsibilities'
    },
    failing: {
      range: [0, 29],
      description: 'No clear impact or achievements shown'
    }
  },

  prompts: {
    analysis: `Analyze the demonstrated impact and achievements:
1. Identify quantified results and metrics
2. Evaluate business value and ROI
3. Assess problem-solving examples
4. Review innovation and improvements
5. Check for leadership impact`,

    scoring: `Score the impact demonstration from 0-100 based on:
- 40%: Presence of quantifiable metrics
- 25%: Business value clarity
- 15%: Variety of impact types
- 10%: Innovation examples
- 10%: Leadership and influence`
  }
};

/**
 * Pattern to detect quantified achievements
 */
const QUANTIFICATION_PATTERNS = [
  /\d+%/, // Percentages
  /\$[\d,]+/, // Dollar amounts
  /\d+x/, // Multipliers
  /\d+ (hours|days|weeks|months)/, // Time savings
  /\d+ (people|users|customers|clients)/, // Scale metrics
  /(increased|decreased|reduced|improved) by \d+/ // Change metrics
];

/**
 * Generate impact analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateImpactAnalysisPrompt = curry(context => {
  const { seniorityLevel, industry } = context;

  const promptParts = [IMPACT_CRITIC.prompts.analysis];

  if (seniorityLevel === 'senior' || seniorityLevel === 'executive') {
    promptParts.push('\n\nFor senior-level positions, also evaluate:');
    promptParts.push('\n- Strategic impact and organizational change');
    promptParts.push('\n- Revenue/cost impact at scale');
    promptParts.push('\n- Team and department-level achievements');
  }

  if (industry) {
    promptParts.push(`\n\nIndustry-specific impact areas (${industry}):`);
    promptParts.push('\n- Key performance indicators for the industry');
    promptParts.push('\n- Relevant compliance or quality improvements');
    promptParts.push('\n- Industry-specific value metrics');
  }

  return promptParts.join('');
});

/**
 * Detect quantified achievements in text
 * @param {string} text - Text to analyze
 * @returns {Object} Quantification analysis
 */
const detectQuantification = curry(text => {
  const matches = QUANTIFICATION_PATTERNS.reduce(
    (acc, pattern) => acc + (text.match(pattern) ? 1 : 0),
    0
  );

  return {
    hasQuantification: matches > 0,
    quantificationCount: matches,
    quantificationScore: Math.min(matches * 20, 100)
  };
});

/**
 * Generate impact improvements
 * @param {Object} evaluation - Impact evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateImpactImprovements = curry(evaluation => {
  const improvements = [];
  const { score, lackingAreas = [] } = evaluation;

  if (lackingAreas.includes('metrics')) {
    improvements.push('Add specific numbers, percentages, or dollar amounts');
  }

  if (lackingAreas.includes('business_value')) {
    improvements.push('Connect achievements to business outcomes (revenue, cost, efficiency)');
  }

  if (lackingAreas.includes('scope')) {
    improvements.push('Clarify the scale and scope of your impact');
  }

  if (score < 50) {
    improvements.push('Transform responsibility statements into achievement statements');
    improvements.push('Use CAR format: Challenge, Action, Result');
  }

  if (score < 80) {
    improvements.push('Include both individual and team achievements');
  }

  return improvements.slice(0, 5);
});

/**
 * Categorize impact types
 * @param {string} text - Achievement text
 * @returns {Array<string>} Impact categories
 */
const categorizeImpact = curry(text => {
  const categories = [];
  const lowerText = text.toLowerCase();

  if (test(/revenue|sales|profit/, lowerText)) {
    categories.push('revenue');
  }
  if (test(/cost|savings|budget/, lowerText)) {
    categories.push('cost');
  }
  if (test(/efficiency|productivity|time/, lowerText)) {
    categories.push('efficiency');
  }
  if (test(/quality|error|defect/, lowerText)) {
    categories.push('quality');
  }
  if (test(/customer|client|satisfaction/, lowerText)) {
    categories.push('customer');
  }

  return categories;
});

module.exports = {
  IMPACT_CRITIC,
  generateImpactAnalysisPrompt,
  detectQuantification,
  generateImpactImprovements,
  categorizeImpact,
  QUANTIFICATION_PATTERNS
};
