/**
 * @module prompts/industry
 * @description Industry-specific context loader and enrichment for resume evaluation
 */

const { curry, pipe, map, prop, merge, defaultTo, evolve } = require('ramda');
const { memoize } = require('../utils/functional');
const { logger } = require('../utils/logger');

/**
 * Industry definitions with evaluation criteria and context
 * @type {Object}
 */
const INDUSTRY_DEFINITIONS = {
  technology: {
    name: 'Technology',
    keywords: [
      'agile', 'scrum', 'CI/CD', 'cloud', 'microservices', 'API', 'DevOps',
      'scalability', 'architecture', 'full-stack', 'backend', 'frontend',
      'database', 'security', 'performance', 'optimization', 'testing',
      'deployment', 'containerization', 'kubernetes', 'docker'
    ],
    skills: {
      technical: ['programming languages', 'frameworks', 'tools', 'platforms'],
      soft: ['problem-solving', 'collaboration', 'communication', 'adaptability']
    },
    focus: 'Technical skills, project impact, modern development practices, and scalable solutions',
    evaluation_weights: {
      keyword: 1.2,
      experience: 1.0,
      impact: 1.5,
      requirements: 1.3
    },
    specific_criteria: [
      'Demonstrate understanding of software development lifecycle',
      'Show experience with modern tech stack',
      'Quantify performance improvements and optimizations',
      'Highlight collaborative development experience'
    ]
  },

  finance: {
    name: 'Finance',
    keywords: [
      'compliance', 'risk management', 'analysis', 'reporting', 'regulatory',
      'audit', 'financial modeling', 'forecasting', 'budgeting', 'investment',
      'portfolio', 'trading', 'accounting', 'taxation', 'financial statements',
      'ROI', 'P&L', 'reconciliation', 'due diligence', 'valuation'
    ],
    skills: {
      technical: ['financial analysis', 'modeling', 'regulatory knowledge', 'software proficiency'],
      soft: ['attention to detail', 'analytical thinking', 'integrity', 'communication']
    },
    focus: 'Attention to detail, analytical skills, regulatory knowledge, and quantitative achievements',
    evaluation_weights: {
      completeness: 1.3,
      readability: 1.2,
      experience: 1.1,
      requirements: 1.4
    },
    specific_criteria: [
      'Demonstrate knowledge of financial regulations',
      'Show analytical and quantitative skills',
      'Highlight accuracy and attention to detail',
      'Include relevant certifications (CPA, CFA, etc.)'
    ]
  },

  healthcare: {
    name: 'Healthcare',
    keywords: [
      'patient care', 'HIPAA', 'clinical', 'EMR', 'EHR', 'compliance', 'safety',
      'diagnosis', 'treatment', 'healthcare technology', 'medical records',
      'quality improvement', 'patient satisfaction', 'clinical protocols',
      'healthcare regulations', 'infection control', 'patient outcomes'
    ],
    skills: {
      technical: ['clinical skills', 'medical technology', 'regulatory compliance', 'documentation'],
      soft: ['empathy', 'communication', 'teamwork', 'adaptability', 'attention to detail']
    },
    focus: 'Patient outcomes, compliance, healthcare technology, and quality improvement initiatives',
    evaluation_weights: {
      requirements: 1.5,
      completeness: 1.3,
      experience: 1.2,
      impact: 1.1
    },
    specific_criteria: [
      'Emphasize patient care and outcomes',
      'Show compliance with healthcare regulations',
      'Highlight quality improvement contributions',
      'Include relevant licenses and certifications'
    ]
  },

  marketing: {
    name: 'Marketing',
    keywords: [
      'ROI', 'campaign', 'analytics', 'brand', 'digital', 'SEO', 'conversion',
      'content', 'social media', 'engagement', 'strategy', 'market research',
      'customer acquisition', 'lead generation', 'A/B testing', 'metrics',
      'branding', 'positioning', 'marketing automation', 'CRM'
    ],
    skills: {
      technical: ['digital marketing', 'analytics tools', 'content creation', 'marketing platforms'],
      soft: ['creativity', 'strategic thinking', 'communication', 'adaptability']
    },
    focus: 'Measurable results, creativity, data-driven decisions, and campaign effectiveness',
    evaluation_weights: {
      impact: 1.5,
      keyword: 1.2,
      experience: 1.1,
      readability: 1.3
    },
    specific_criteria: [
      'Quantify campaign results and ROI',
      'Show creative and strategic thinking',
      'Demonstrate data-driven decision making',
      'Highlight multi-channel marketing experience'
    ]
  },

  education: {
    name: 'Education',
    keywords: [
      'curriculum', 'instruction', 'assessment', 'student outcomes', 'differentiation',
      'classroom management', 'lesson planning', 'educational technology',
      'professional development', 'parent communication', 'IEP', 'standards',
      'pedagogy', 'learning objectives', 'student engagement', 'academic achievement'
    ],
    skills: {
      technical: ['curriculum development', 'assessment design', 'educational technology', 'data analysis'],
      soft: ['communication', 'patience', 'creativity', 'leadership', 'empathy']
    },
    focus: 'Student outcomes, innovative teaching methods, curriculum development, and educational impact',
    evaluation_weights: {
      experience: 1.3,
      impact: 1.4,
      completeness: 1.2,
      readability: 1.1
    },
    specific_criteria: [
      'Highlight student achievement and growth',
      'Show innovative teaching approaches',
      'Demonstrate continuous professional development',
      'Include relevant certifications and endorsements'
    ]
  },

  sales: {
    name: 'Sales',
    keywords: [
      'quota', 'revenue', 'pipeline', 'closing rate', 'customer acquisition',
      'relationship building', 'negotiation', 'prospecting', 'CRM', 'sales cycle',
      'territory management', 'lead generation', 'conversion', 'upselling',
      'cross-selling', 'client retention', 'sales strategy', 'forecasting'
    ],
    skills: {
      technical: ['CRM systems', 'sales methodology', 'data analysis', 'presentation skills'],
      soft: ['communication', 'persuasion', 'resilience', 'relationship building', 'negotiation']
    },
    focus: 'Quantifiable sales achievements, revenue impact, relationship building, and quota attainment',
    evaluation_weights: {
      impact: 1.6,
      experience: 1.2,
      keyword: 1.1,
      requirements: 1.2
    },
    specific_criteria: [
      'Quantify sales achievements and quota attainment',
      'Show revenue generation and growth',
      'Highlight client relationship success',
      'Demonstrate knowledge of sales methodologies'
    ]
  },

  engineering: {
    name: 'Engineering',
    keywords: [
      'design', 'analysis', 'optimization', 'CAD', 'simulation', 'prototyping',
      'manufacturing', 'quality control', 'project management', 'specifications',
      'testing', 'validation', 'compliance', 'safety standards', 'lean',
      'six sigma', 'continuous improvement', 'technical documentation'
    ],
    skills: {
      technical: ['engineering software', 'analysis tools', 'project management', 'technical standards'],
      soft: ['problem-solving', 'attention to detail', 'teamwork', 'communication']
    },
    focus: 'Technical expertise, project outcomes, innovation, safety compliance, and process improvement',
    evaluation_weights: {
      experience: 1.3,
      requirements: 1.4,
      impact: 1.2,
      completeness: 1.2
    },
    specific_criteria: [
      'Demonstrate technical problem-solving abilities',
      'Show project management experience',
      'Highlight safety and compliance knowledge',
      'Include relevant professional certifications'
    ]
  },

  general: {
    name: 'General',
    keywords: [],
    skills: {
      technical: ['relevant technical skills'],
      soft: ['communication', 'teamwork', 'problem-solving', 'adaptability']
    },
    focus: 'Professional experience, achievements, skills alignment, and career progression',
    evaluation_weights: {
      keyword: 1.0,
      experience: 1.0,
      impact: 1.0,
      readability: 1.0,
      completeness: 1.0,
      relevance: 1.0,
      requirements: 1.0
    },
    specific_criteria: [
      'Clearly communicate value proposition',
      'Show relevant experience and skills',
      'Demonstrate measurable achievements',
      'Present information clearly and concisely'
    ]
  }
};

/**
 * Role-level modifiers for evaluation
 * @type {Object}
 */
const ROLE_LEVEL_MODIFIERS = {
  entry: {
    focus_shift: 'potential and learning ability',
    weight_adjustments: {
      experience: 0.7,
      requirements: 0.8,
      completeness: 1.2,
      readability: 1.3
    }
  },
  mid: {
    focus_shift: 'proven experience and growth',
    weight_adjustments: {
      experience: 1.0,
      impact: 1.1,
      requirements: 1.0
    }
  },
  senior: {
    focus_shift: 'leadership and strategic impact',
    weight_adjustments: {
      impact: 1.3,
      experience: 1.2,
      requirements: 1.1
    }
  },
  executive: {
    focus_shift: 'vision, leadership, and business impact',
    weight_adjustments: {
      impact: 1.5,
      experience: 1.3,
      readability: 1.2
    }
  }
};

/**
 * Get industry definition
 * @param {string} industryName - Name of the industry
 * @returns {Object} Industry definition
 */
const getIndustry = curry(industryName => {
  const normalizedName = (industryName || 'general').toLowerCase();
  return defaultTo(INDUSTRY_DEFINITIONS.general, prop(normalizedName, INDUSTRY_DEFINITIONS));
});

/**
 * Extract role level from job title
 * @param {string} jobTitle - Job title
 * @returns {string} Role level
 */
const extractRoleLevel = (jobTitle = '') => {
  const title = jobTitle.toLowerCase();

  if (title.includes('intern') || title.includes('junior') || title.includes('entry')) {
    return 'entry';
  } if (title.includes('senior') || title.includes('lead') || title.includes('principal')) {
    return 'senior';
  } if (title.includes('director') || title.includes('vp') || title.includes('president')
             || title.includes('chief') || title.includes('head of')) {
    return 'executive';
  }

  return 'mid';
};

/**
 * Apply role level modifiers to industry context
 * @param {string} roleLevel - Role level
 * @param {Object} industryContext - Industry context
 * @returns {Object} Modified context
 */
const applyRoleLevelModifiers = curry((roleLevel, industryContext) => {
  const modifiers = prop(roleLevel, ROLE_LEVEL_MODIFIERS) || prop('mid', ROLE_LEVEL_MODIFIERS);

  return evolve({
    focus: focus => `${focus}, with emphasis on ${modifiers.focus_shift}`,
    evaluation_weights: weights => merge(weights, modifiers.weight_adjustments)
  })(industryContext);
});

/**
 * Enrich context with additional industry insights
 * @param {Object} options - Enrichment options
 * @returns {Object} Enriched industry context
 */
const enrichIndustryContext = curry(options => {
  const { industry, jobTitle, customKeywords = [] } = options;

  // Get base industry context
  let context = getIndustry(industry);

  // Apply role level modifiers
  const roleLevel = extractRoleLevel(jobTitle);
  context = applyRoleLevelModifiers(roleLevel, context);

  // Add custom keywords
  if (customKeywords.length > 0) {
    context = evolve({
      keywords: keywords => [...keywords, ...customKeywords]
    })(context);
  }

  // Add metadata
  context.metadata = {
    roleLevel,
    industryName: industry || 'general',
    jobTitle: jobTitle || 'unspecified',
    customizationsApplied: customKeywords.length > 0
  };

  return context;
});

/**
 * Generate industry-specific prompt additions
 * @param {Object} industryContext - Industry context
 * @returns {string} Prompt additions
 */
const generateIndustryPromptAdditions = curry(industryContext => {
  const additions = [
    `\nFor this ${industryContext.name} industry evaluation, pay special attention to:`,
    `- ${industryContext.focus}`,
    ''
  ];

  if (industryContext.specific_criteria.length > 0) {
    additions.push('Key evaluation criteria:');
    industryContext.specific_criteria.forEach(criteria => {
      additions.push(`- ${criteria}`);
    });
  }

  return additions.join('\n');
});

/**
 * Get evaluation weight for a specific critic
 * @param {string} criticName - Name of the critic
 * @param {Object} industryContext - Industry context
 * @returns {number} Weight value
 */
const getCriticWeight = curry((criticName, industryContext) => prop(criticName, industryContext.evaluation_weights) || 1.0);

/**
 * Calculate weighted score based on industry context
 * @param {Array<Object>} evaluations - Evaluation results
 * @param {Object} industryContext - Industry context
 * @returns {number} Weighted overall score
 */
const calculateWeightedScore = curry((industryContext, evaluations) => {
  const weightedSum = reduce((sum, evaluation) => {
    const weight = getCriticWeight(evaluation.critic, industryContext);
    return sum + (evaluation.score * weight);
  }, 0, evaluations);

  const totalWeight = reduce((sum, evaluation) => {
    const weight = getCriticWeight(evaluation.critic, industryContext);
    return sum + weight;
  }, 0, evaluations);

  return Math.round(weightedSum / totalWeight);
});

/**
 * Memoized industry context loader
 */
const memoizedGetIndustry = memoize(getIndustry);
const memoizedEnrichContext = memoize(enrichIndustryContext);

module.exports = {
  // Industry definitions
  INDUSTRY_DEFINITIONS,
  ROLE_LEVEL_MODIFIERS,

  // Core functions
  getIndustry: memoizedGetIndustry,
  enrichIndustryContext: memoizedEnrichContext,
  extractRoleLevel,

  // Context application
  applyRoleLevelModifiers,
  generateIndustryPromptAdditions,

  // Scoring
  getCriticWeight,
  calculateWeightedScore,

  // Utilities
  getAllIndustries: () => Object.keys(INDUSTRY_DEFINITIONS),
  getAllRoleLevels: () => Object.keys(ROLE_LEVEL_MODIFIERS)
};
