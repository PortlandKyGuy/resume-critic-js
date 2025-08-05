/**
 * @module prompts/critics/requirements
 * @description Requirements match critic prompt generator
 */

const { curry, pipe, map, filter, reduce, prop } = require('ramda');

/**
 * Requirements critic configuration
 */
const REQUIREMENTS_CRITIC = {
  name: 'requirements',
  displayName: 'Requirements Match',
  description: 'Evaluates match against specific job requirements',

  criteria: {
    primary: [
      'Required skills coverage',
      'Experience years match',
      'Education requirements',
      'Certification requirements',
      'Location/visa status'
    ],
    secondary: [
      'Preferred qualifications',
      'Nice-to-have skills',
      'Industry preferences',
      'Language requirements'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'Exceeds all requirements with additional qualifications'
    },
    good: {
      range: [70, 89],
      description: 'Meets all core requirements'
    },
    adequate: {
      range: [50, 69],
      description: 'Meets most requirements with some gaps'
    },
    poor: {
      range: [30, 49],
      description: 'Meets some requirements but significant gaps exist'
    },
    failing: {
      range: [0, 29],
      description: 'Fails to meet critical requirements'
    }
  },

  prompts: {
    analysis: `Match resume against specific job requirements:
1. Check all required skills and qualifications
2. Verify minimum experience requirements
3. Confirm education prerequisites
4. Validate required certifications
5. Assess location and work authorization`,

    scoring: `Score requirements match from 0-100 based on:
- 40%: Required skills coverage
- 20%: Experience requirements met
- 15%: Education requirements
- 15%: Certification requirements
- 10%: Other requirements (location, languages, etc.)`
  }
};

/**
 * Requirement types and weights
 */
const REQUIREMENT_WEIGHTS = {
  required: 1.0,
  preferred: 0.5,
  nice_to_have: 0.25
};

/**
 * Generate requirements analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateRequirementsAnalysisPrompt = curry(context => {
  const {
    jobRequirements = {},
    mustHaveSkills = [],
    preferredQualifications = [],
    educationRequired,
    yearsRequired
  } = context;

  let prompt = REQUIREMENTS_CRITIC.prompts.analysis;

  if (mustHaveSkills.length > 0) {
    prompt += '\n\nMust-have skills:';
    mustHaveSkills.forEach(skill => {
      prompt += `\n- ${skill} [REQUIRED]`;
    });
  }

  if (preferredQualifications.length > 0) {
    prompt += '\n\nPreferred qualifications:';
    preferredQualifications.forEach(qual => {
      prompt += `\n- ${qual} [PREFERRED]`;
    });
  }

  if (educationRequired) {
    prompt += `\n\nEducation requirement: ${educationRequired}`;
  }

  if (yearsRequired) {
    prompt += `\n\nMinimum experience: ${yearsRequired} years`;
  }

  return prompt;
});

/**
 * Match requirements checklist
 * @param {Object} requirements - Job requirements
 * @param {Object} candidateProfile - Candidate profile
 * @returns {Object} Requirements match analysis
 */
const matchRequirementsChecklist = curry((requirements, candidateProfile) => {
  const results = {
    met: [],
    notMet: [],
    partial: [],
    score: 0
  };

  // Check each requirement category
  Object.entries(requirements).forEach(([category, items]) => {
    items.forEach(item => {
      const requirement = typeof item === 'string' ? { name: item, type: 'required' } : item;
      const isMet = checkRequirement(requirement, candidateProfile);

      if (isMet === 'full') {
        results.met.push(requirement);
      } else if (isMet === 'partial') {
        results.partial.push(requirement);
      } else {
        results.notMet.push(requirement);
      }
    });
  });

  // Calculate score
  const totalWeight = calculateTotalWeight(requirements);
  const achievedWeight = calculateAchievedWeight(results);
  results.score = Math.round((achievedWeight / totalWeight) * 100);

  return results;
});

/**
 * Check individual requirement
 * @param {Object} requirement - Single requirement
 * @param {Object} candidateProfile - Candidate profile
 * @returns {string} Match status
 */
const checkRequirement = curry((requirement, candidateProfile) => {
  // Simplified check - in production, use more sophisticated matching
  const { name, type } = requirement;
  const profileText = JSON.stringify(candidateProfile).toLowerCase();
  const requirementText = name.toLowerCase();

  if (profileText.includes(requirementText)) {
    return 'full';
  }

  // Check for related terms
  const related = getRelatedTerms(requirementText);
  if (related.some(term => profileText.includes(term))) {
    return 'partial';
  }

  return 'none';
});

/**
 * Get related terms for requirement matching
 * @param {string} requirement - Requirement text
 * @returns {Array<string>} Related terms
 */
const getRelatedTerms = requirement => {
  const termMap = {
    javascript: ['js', 'node', 'react', 'vue', 'angular'],
    python: ['django', 'flask', 'pandas', 'numpy'],
    management: ['lead', 'manager', 'supervisor', 'coordinator'],
    communication: ['presentation', 'writing', 'speaking', 'collaboration']
  };

  return termMap[requirement] || [];
};

/**
 * Calculate total requirement weight
 * @param {Object} requirements - All requirements
 * @returns {number} Total weight
 */
const calculateTotalWeight = requirements => reduce((total, category) => total + reduce((catTotal, item) => {
  const weight = REQUIREMENT_WEIGHTS[item.type || 'required'] || 1.0;
  return catTotal + weight;
}, 0, category), 0, Object.values(requirements));

/**
 * Calculate achieved weight
 * @param {Object} results - Match results
 * @returns {number} Achieved weight
 */
const calculateAchievedWeight = results => {
  const fullWeight = reduce((total, req) => total + (REQUIREMENT_WEIGHTS[req.type] || 1.0), 0, results.met);

  const partialWeight = reduce((total, req) => total + ((REQUIREMENT_WEIGHTS[req.type] || 1.0) * 0.5), 0, results.partial);

  return fullWeight + partialWeight;
};

/**
 * Generate requirements improvements
 * @param {Object} evaluation - Requirements evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateRequirementsImprovements = curry(evaluation => {
  const improvements = [];
  const { notMet = [], partial = [] } = evaluation;

  // Address critical missing requirements first
  const criticalMissing = filter(req => req.type === 'required', notMet);
  if (criticalMissing.length > 0) {
    criticalMissing.slice(0, 2).forEach(req => {
      improvements.push(`Add evidence of ${req.name} experience or training`);
    });
  }

  // Improve partial matches
  if (partial.length > 0) {
    improvements.push(`Strengthen demonstration of ${partial[0].name} competency`);
  }

  // General suggestions based on score
  if (evaluation.score < 50) {
    improvements.push('Consider additional training or certifications for missing requirements');
    improvements.push('Highlight transferable skills that relate to requirements');
  }

  if (evaluation.score < 80) {
    improvements.push('Expand descriptions to clearly show requirement coverage');
  }

  return improvements.slice(0, 5);
});

/**
 * Check years of experience requirement
 * @param {number} required - Required years
 * @param {number} actual - Actual years
 * @returns {Object} Experience match result
 */
const checkExperienceYears = curry((required, actual) => {
  const difference = actual - required;

  return {
    meets: difference >= 0,
    score: difference >= 0 ? 100 : Math.max(0, 100 - (Math.abs(difference) * 20)),
    feedback: difference >= 0
      ? `Meets experience requirement (${actual} years)`
      : `Below requirement by ${Math.abs(difference)} years`
  };
});

module.exports = {
  REQUIREMENTS_CRITIC,
  REQUIREMENT_WEIGHTS,
  generateRequirementsAnalysisPrompt,
  matchRequirementsChecklist,
  checkRequirement,
  generateRequirementsImprovements,
  checkExperienceYears,
  calculateTotalWeight,
  calculateAchievedWeight
};
