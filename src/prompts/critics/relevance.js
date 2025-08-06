/**
 * @module prompts/critics/relevance
 * @description Role relevance critic prompt generator
 */

const { curry, map, filter, intersection, includes } = require('ramda');

/**
 * Relevance critic configuration
 */
const RELEVANCE_CRITIC = {
  name: 'relevance',
  displayName: 'Role Relevance',
  description: 'Evaluates alignment between resume and target position',

  criteria: {
    primary: [
      'Skills match with requirements',
      'Experience alignment',
      'Industry/domain fit',
      'Seniority appropriateness',
      'Core competencies coverage'
    ],
    secondary: [
      'Transferable skills highlight',
      'Cultural fit indicators',
      'Growth potential signals',
      'Motivation alignment'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'Perfect alignment with role requirements and culture'
    },
    good: {
      range: [70, 89],
      description: 'Strong alignment with minor gaps in experience or skills'
    },
    adequate: {
      range: [50, 69],
      description: 'Moderate relevance with repositioning opportunities'
    },
    poor: {
      range: [30, 49],
      description: 'Limited relevance requiring significant development'
    },
    failing: {
      range: [0, 29],
      description: 'Poor fit for the target role'
    }
  },

  prompts: {
    analysis: `Evaluate resume relevance to the target position:
1. Match skills against job requirements
2. Assess experience relevance and transferability
3. Check industry and domain alignment
4. Evaluate seniority level appropriateness
5. Identify transferable skills and competencies`,

    scoring: `Score relevance from 0-100 based on:
- 35%: Skills match with requirements
- 30%: Experience relevance
- 15%: Industry/domain alignment
- 10%: Seniority appropriateness
- 10%: Transferable skills demonstration`
  }
};

/**
 * Generate relevance analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateRelevanceAnalysisPrompt = curry(context => {
  const { jobTitle, requiredSkills = [], preferredSkills = [], industry } = context;

  const promptParts = [RELEVANCE_CRITIC.prompts.analysis];

  if (jobTitle) {
    promptParts.push(`\n\nTarget position: ${jobTitle}`);
  }

  if (requiredSkills.length > 0) {
    promptParts.push('\n\nRequired skills to match:');
    promptParts.push(...requiredSkills.map(skill => `\n- ${skill}`));
  }

  if (preferredSkills.length > 0) {
    promptParts.push('\n\nPreferred skills (bonus points):');
    promptParts.push(...preferredSkills.map(skill => `\n- ${skill}`));
  }

  if (industry) {
    promptParts.push(`\n\nIndustry context: ${industry}`);
    promptParts.push('\nConsider industry-specific experience and terminology');
  }

  return promptParts.join('');
});

/**
 * Calculate skills match score
 * @param {Array<string>} requiredSkills - Required skills
 * @param {Array<string>} candidateSkills - Candidate's skills
 * @returns {Object} Skills match analysis
 */
const calculateSkillsMatch = curry((requiredSkills, candidateSkills) => {
  if (requiredSkills.length === 0) {
    return { matchScore: 75, matchedSkills: [], missingSkills: [] };
  }

  const normalizedRequired = map(s => s.toLowerCase(), requiredSkills);
  const normalizedCandidate = map(s => s.toLowerCase(), candidateSkills);

  const matchedSkills = intersection(normalizedRequired, normalizedCandidate);
  const missingSkills = filter(
    skill => !includes(skill, normalizedCandidate),
    normalizedRequired
  );

  const matchScore = Math.round((matchedSkills.length / requiredSkills.length) * 100);

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    coveragePercentage: matchScore
  };
});

/**
 * Assess seniority level match
 * @param {string} targetLevel - Target seniority level
 * @param {Object} candidateProfile - Candidate profile analysis
 * @returns {Object} Seniority match analysis
 */
const assessSeniorityMatch = curry((targetLevel, candidateProfile) => {
  const levelMap = {
    entry: { minYears: 0, maxYears: 2 },
    mid: { minYears: 2, maxYears: 7 },
    senior: { minYears: 7, maxYears: 15 },
    executive: { minYears: 10, maxYears: null }
  };

  const target = levelMap[targetLevel] || levelMap.mid;
  const candidateYears = candidateProfile.totalExperience || 0;

  if (candidateYears < target.minYears) {
    const yearsDiff = target.minYears - candidateYears;
    return {
      matchScore: Math.max(50, 100 - (yearsDiff * 15)),
      feedback: 'May need more experience for this level',
      candidateLevel: candidateProfile.inferredLevel,
      targetLevel
    };
  }

  if (target.maxYears && candidateYears > target.maxYears) {
    return {
      matchScore: 85, // Overqualified is less penalized
      feedback: 'May be overqualified for this level',
      candidateLevel: candidateProfile.inferredLevel,
      targetLevel
    };
  }

  return {
    matchScore: 100,
    feedback: 'Experience level well-matched',
    candidateLevel: candidateProfile.inferredLevel,
    targetLevel
  };
});

/**
 * Generate relevance improvements
 * @param {Object} evaluation - Relevance evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateRelevanceImprovements = curry(evaluation => {
  const improvements = [];
  const { missingSkills = [], relevanceGaps = [], score } = evaluation;

  if (missingSkills.length > 0) {
    improvements.push(`Highlight experience with: ${missingSkills.slice(0, 3).join(', ')}`);
    improvements.push('Add relevant projects or training for missing skills');
  }

  if (relevanceGaps.includes('industry')) {
    improvements.push('Emphasize transferable experience from other industries');
    improvements.push('Use industry-specific terminology and keywords');
  }

  if (relevanceGaps.includes('seniority')) {
    improvements.push('Adjust experience descriptions to match target level');
    improvements.push('Highlight leadership or advanced responsibilities');
  }

  if (score < 70) {
    improvements.push('Reorder experiences to prioritize most relevant roles');
    improvements.push('Create a targeted summary for this specific position');
  }

  return improvements.slice(0, 5);
});

/**
 * Identify transferable skills
 * @param {Object} experience - Candidate experience
 * @param {Object} targetRole - Target role requirements
 * @returns {Array<string>} Transferable skills
 */
const identifyTransferableSkills = curry(experience => {
  const transferableCategories = {
    leadership: ['managed', 'led', 'directed', 'coordinated', 'supervised'],
    analytical: ['analyzed', 'evaluated', 'assessed', 'researched', 'investigated'],
    communication: ['presented', 'communicated', 'wrote', 'documented', 'reported'],
    technical: ['developed', 'implemented', 'designed', 'built', 'created'],
    strategic: ['planned', 'strategized', 'forecasted', 'budgeted', 'optimized']
  };

  // Simple implementation - in production, use NLP
  const transferableSkills = Object.entries(transferableCategories)
    .filter(([, keywords]) => keywords.some(keyword => experience.toLowerCase().includes(keyword)))
    .map(([category]) => category);

  return transferableSkills;
});

module.exports = {
  RELEVANCE_CRITIC,
  generateRelevanceAnalysisPrompt,
  calculateSkillsMatch,
  assessSeniorityMatch,
  generateRelevanceImprovements,
  identifyTransferableSkills
};
