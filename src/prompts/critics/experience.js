/**
 * @module prompts/critics/experience
 * @description Experience evaluation critic prompt generator
 */

const { curry, map } = require('ramda');

/**
 * Experience critic configuration
 */
const EXPERIENCE_CRITIC = {
  name: 'experience',
  displayName: 'Experience Presentation',
  description: 'Evaluates professional experience relevance and presentation',

  criteria: {
    primary: [
      'Relevance to target role',
      'Career progression clarity',
      'Achievement quantification',
      'Responsibility descriptions',
      'Experience depth'
    ],
    secondary: [
      'Gap explanations',
      'Industry alignment',
      'Leadership indicators',
      'Growth trajectory'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'Compelling experience directly aligned with role requirements'
    },
    good: {
      range: [70, 89],
      description: 'Strong relevant experience with minor presentation gaps'
    },
    adequate: {
      range: [50, 69],
      description: 'Relevant experience but needs better articulation'
    },
    poor: {
      range: [30, 49],
      description: 'Limited relevant experience or poor presentation'
    },
    failing: {
      range: [0, 29],
      description: 'Minimal relevant experience for the role'
    }
  },

  prompts: {
    analysis: `Evaluate the professional experience section:
1. Assess relevance to the target position
2. Review career progression and growth
3. Check for quantified achievements
4. Evaluate clarity of responsibilities
5. Analyze depth and breadth of experience`,

    scoring: `Score the experience presentation from 0-100 based on:
- 35%: Direct relevance to target role
- 25%: Quality of achievement descriptions
- 20%: Career progression demonstration
- 10%: Clarity and organization
- 10%: Leadership and growth indicators`
  }
};

/**
 * Generate experience analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateExperienceAnalysisPrompt = curry(context => {
  const { jobTitle, requiredExperience, seniorityLevel } = context;

  const promptParts = [EXPERIENCE_CRITIC.prompts.analysis];

  if (jobTitle) {
    promptParts.push(`\n\nTarget role: ${jobTitle}`);
  }

  if (requiredExperience) {
    promptParts.push(`\n\nRequired experience level: ${requiredExperience}`);
  }

  if (seniorityLevel) {
    promptParts.push(`\n\nExpected seniority indicators for ${seniorityLevel} level:`);
    promptParts.push('\n- Scope of responsibilities');
    promptParts.push('\n- Team size and budget (if applicable)');
    promptParts.push('\n- Strategic vs tactical focus');
  }

  return promptParts.join('');
});

/**
 * Analyze experience progression
 * @param {Array<Object>} experiences - Work experiences
 * @returns {Object} Progression analysis
 */
const analyzeExperienceProgression = curry(experiences => {
  if (!experiences || experiences.length === 0) {
    return { hasProgression: false, progressionScore: 0 };
  }

  // Simple progression analysis
  const titles = map(exp => exp.title || '', experiences);
  const hasProgression = titles.some((title, idx) => idx > 0
    && (title.includes('Senior') || title.includes('Lead') || title.includes('Manager')));

  return {
    hasProgression,
    progressionScore: hasProgression ? 80 : 60,
    experienceCount: experiences.length
  };
});

/**
 * Generate experience improvements
 * @param {Object} evaluation - Experience evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateExperienceImprovements = curry(evaluation => {
  const improvements = [];
  const { score, missingElements = [] } = evaluation;

  if (missingElements.includes('quantification')) {
    improvements.push('Add measurable achievements with specific metrics');
  }

  if (missingElements.includes('relevance')) {
    improvements.push('Highlight experiences most relevant to target role');
  }

  if (missingElements.includes('progression')) {
    improvements.push('Clearly show career growth and increasing responsibilities');
  }

  if (score < 70) {
    improvements.push('Use STAR method (Situation, Task, Action, Result) for achievements');
    improvements.push('Focus on impact rather than just responsibilities');
  }

  return improvements.slice(0, 5);
});

module.exports = {
  EXPERIENCE_CRITIC,
  generateExperienceAnalysisPrompt,
  analyzeExperienceProgression,
  generateExperienceImprovements
};
