/**
 * @module prompts/critics/readability
 * @description Readability and format critic prompt generator
 */

const { curry, split } = require('ramda');

/**
 * Readability critic configuration
 */
const READABILITY_CRITIC = {
  name: 'readability',
  displayName: 'Readability & Format',
  description: 'Evaluates resume clarity, structure, and visual presentation',

  criteria: {
    primary: [
      'Clear structure and sections',
      'Consistent formatting',
      'Appropriate length',
      'Scannable content',
      'Professional appearance'
    ],
    secondary: [
      'White space usage',
      'Font consistency',
      'Bullet point effectiveness',
      'Grammar and spelling',
      'Visual hierarchy'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'Exceptionally clear, professional, and easy to scan'
    },
    good: {
      range: [70, 89],
      description: 'Well-formatted with minor improvements needed'
    },
    adequate: {
      range: [50, 69],
      description: 'Readable but formatting could be improved'
    },
    poor: {
      range: [30, 49],
      description: 'Poor formatting significantly affects readability'
    },
    failing: {
      range: [0, 29],
      description: 'Very difficult to read due to formatting issues'
    }
  },

  prompts: {
    analysis: `Evaluate the resume's readability and format:
1. Assess overall structure and organization
2. Check formatting consistency
3. Evaluate content scannability
4. Review grammar and language clarity
5. Analyze visual presentation and hierarchy`,

    scoring: `Score the readability from 0-100 based on:
- 30%: Structure and organization clarity
- 25%: Formatting consistency
- 20%: Content scannability
- 15%: Grammar and language quality
- 10%: Professional appearance`
  }
};

/**
 * Generate readability analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateReadabilityAnalysisPrompt = curry(context => {
  const { targetLength = '1-2 pages' } = context;

  const promptParts = [
    READABILITY_CRITIC.prompts.analysis,
    '\n\nSpecific areas to check:',
    '\n- Section headers clarity and consistency',
    '\n- Bullet point structure and parallelism',
    '\n- Date formatting consistency',
    '\n- Appropriate use of bold/italic text',
    `\n- Length appropriateness (target: ${targetLength})`
  ];

  return promptParts.join('');
});

/**
 * Analyze text readability metrics
 * @param {string} text - Text to analyze
 * @returns {Object} Readability metrics
 */
const analyzeReadabilityMetrics = curry(text => {
  const sentences = split(/[.!?]+/, text).filter(s => s.trim().length > 0);
  const words = split(/\s+/, text).filter(w => w.length > 0);
  const avgWordsPerSentence = sentences.length > 0
    ? words.length / sentences.length
    : 0;

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence: Math.round(avgWordsPerSentence),
    readabilityScore: (() => {
      if (avgWordsPerSentence < 20) return 90;
      if (avgWordsPerSentence < 30) return 70;
      return 50;
    })()
  };
});

/**
 * Check formatting consistency
 * @param {Object} resumeStructure - Resume structure analysis
 * @returns {Object} Consistency analysis
 */
const checkFormattingConsistency = curry(resumeStructure => {
  const issues = [];

  // Check for common formatting issues
  if (resumeStructure.mixedDateFormats) {
    issues.push('date_formats');
  }

  if (resumeStructure.inconsistentBullets) {
    issues.push('bullet_styles');
  }

  if (resumeStructure.mixedTenses) {
    issues.push('verb_tenses');
  }

  return {
    isConsistent: issues.length === 0,
    consistencyIssues: issues,
    consistencyScore: Math.max(100 - (issues.length * 20), 0)
  };
});

/**
 * Generate readability improvements
 * @param {Object} evaluation - Readability evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateReadabilityImprovements = curry(evaluation => {
  const improvements = [];
  const { score, issues = [] } = evaluation;

  if (issues.includes('structure')) {
    improvements.push('Organize sections in standard order: Summary, Experience, Education, Skills');
  }

  if (issues.includes('consistency')) {
    improvements.push('Ensure consistent formatting for dates, bullets, and headers');
  }

  if (issues.includes('length')) {
    improvements.push('Condense content to fit recommended 1-2 page length');
  }

  if (issues.includes('density')) {
    improvements.push('Add white space between sections for better readability');
  }

  if (score < 70) {
    improvements.push('Use bullet points instead of paragraphs for experience');
    improvements.push('Start each bullet with a strong action verb');
  }

  return improvements.slice(0, 5);
});

/**
 * Assess visual hierarchy
 * @param {Object} formatting - Formatting analysis
 * @returns {number} Visual hierarchy score
 */
const assessVisualHierarchy = curry(formatting => {
  const penalties = [
    { condition: !formatting.hasHeaders, penalty: 20 },
    { condition: !formatting.hasBullets, penalty: 20 },
    { condition: !formatting.hasConsistentSpacing, penalty: 15 },
    { condition: !formatting.hasBoldText, penalty: 10 },
    { condition: formatting.tooManyFonts, penalty: 15 }
  ];

  const totalPenalty = penalties.reduce(
    (sum, { condition, penalty }) => sum + (condition ? penalty : 0),
    0
  );

  return Math.max(100 - totalPenalty, 0);
});

module.exports = {
  READABILITY_CRITIC,
  generateReadabilityAnalysisPrompt,
  analyzeReadabilityMetrics,
  checkFormattingConsistency,
  generateReadabilityImprovements,
  assessVisualHierarchy
};
