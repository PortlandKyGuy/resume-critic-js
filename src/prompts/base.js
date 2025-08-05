/**
 * @module prompts/base
 * @description Core evaluation prompt structures and system prompts for resume evaluation
 */

const { curry, map, pipe, prop, filter } = require('ramda');

/**
 * Base system prompt establishing the evaluator persona
 * @type {string}
 */
const SYSTEM_PROMPT = `You are an expert resume evaluator with 15+ years of experience in talent acquisition across multiple industries.
You have reviewed thousands of resumes and understand what makes candidates stand out.
Your evaluations are objective, constructive, and actionable.

Your expertise includes:
- Technical and non-technical role evaluation
- Industry-specific requirements and terminology
- ATS (Applicant Tracking System) optimization
- Modern hiring trends and best practices

You provide detailed, actionable feedback that helps candidates improve their resumes. Your scoring is consistent and based on clear criteria. You always maintain a professional, encouraging tone while being honest about areas for improvement.

IMPORTANT: You must always respond with valid JSON in the exact format specified. Your response must be parseable by JSON.parse() without errors.`;

/**
 * Output schema for structured evaluation responses
 * @type {Object}
 */
const OUTPUT_SCHEMA = {
  type: 'object',
  required: ['evaluations', 'overall_score', 'summary'],
  properties: {
    evaluations: {
      type: 'array',
      items: {
        type: 'object',
        required: ['critic', 'score', 'feedback', 'improvements'],
        properties: {
          critic: {
            type: 'string',
            enum: ['keyword', 'experience', 'impact', 'readability', 'completeness', 'relevance', 'requirements']
          },
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100
          },
          feedback: {
            type: 'string',
            minLength: 50,
            maxLength: 500
          },
          improvements: {
            type: 'array',
            items: {
              type: 'string'
            },
            minItems: 2,
            maxItems: 5
          }
        }
      }
    },
    overall_score: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    summary: {
      type: 'string',
      minLength: 100,
      maxLength: 1000
    },
    top_strengths: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 2,
      maxItems: 4
    },
    critical_improvements: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 2,
      maxItems: 4
    }
  }
};

/**
 * Critic definitions with evaluation criteria and scoring rubrics
 * @type {Object}
 */
const CRITICS = {
  keyword: {
    name: 'Keyword Optimization',
    criteria: `Evaluate keyword optimization and ATS compatibility:
    - Presence of industry-specific keywords and technical terms
    - Natural keyword integration without stuffing
    - Alignment with job description requirements
    - Use of action verbs and power words
    - Proper formatting for ATS parsing`,
    scoring: `Score 0-100 where:
    - 90-100: Exceptional keyword usage, perfect ATS optimization
    - 70-89: Good keywords, minor improvements needed
    - 50-69: Adequate but missing key terms
    - 30-49: Poor keyword usage, needs significant work
    - 0-29: Severely lacking relevant keywords`,
    examples: [
      { context: 'Software Engineer role', good: 'Developed RESTful APIs using Node.js', bad: 'Made computer programs' },
      { context: 'Data Analyst role', good: 'Analyzed datasets using Python pandas and SQL', bad: 'Worked with data' }
    ]
  },

  experience: {
    name: 'Experience Presentation',
    criteria: `Assess professional experience presentation:
    - Relevance to target role
    - Career progression and growth
    - Quantifiable achievements and impact
    - Clear role descriptions and responsibilities
    - Appropriate level of detail`,
    scoring: `Score 0-100 where:
    - 90-100: Compelling experience directly aligned with role
    - 70-89: Strong experience with minor gaps
    - 50-69: Relevant experience but needs better presentation
    - 30-49: Limited relevant experience or poor presentation
    - 0-29: Minimal relevant experience`,
    examples: [
      {
        good: 'Led team of 5 engineers to deliver product 2 weeks ahead of schedule, resulting in $500K additional revenue',
        bad: 'Managed a team'
      }
    ]
  },

  impact: {
    name: 'Impact Demonstration',
    criteria: `Evaluate demonstrated impact and achievements:
    - Quantifiable results and metrics
    - Business value delivered
    - Problem-solving examples
    - Leadership and initiative
    - Innovation and improvements`,
    scoring: `Score 0-100 where:
    - 90-100: Outstanding impact with clear metrics
    - 70-89: Good impact statements, some metrics
    - 50-69: Shows impact but lacks quantification
    - 30-49: Limited impact demonstration
    - 0-29: No clear impact shown`,
    examples: [
      {
        good: 'Reduced deployment time by 75% through CI/CD automation, saving 20 developer hours weekly',
        bad: 'Improved deployment process'
      }
    ]
  },

  readability: {
    name: 'Readability & Format',
    criteria: `Assess resume clarity and presentation:
    - Clear structure and formatting
    - Concise, scannable content
    - Consistent style and tense
    - Proper grammar and spelling
    - Effective use of white space`,
    scoring: `Score 0-100 where:
    - 90-100: Exceptionally clear and professional
    - 70-89: Well-formatted with minor issues
    - 50-69: Readable but needs formatting improvements
    - 30-49: Poor formatting affects readability
    - 0-29: Very difficult to read`,
    examples: [
      {
        good: '• Bullet points with parallel structure\n• Consistent verb tense\n• Clear section headers',
        bad: 'Dense paragraphs without structure or inconsistent formatting throughout'
      }
    ]
  },

  completeness: {
    name: 'Completeness Check',
    criteria: `Check for essential resume components:
    - Contact information completeness
    - Professional summary/objective
    - Education details
    - Skills section
    - Work history with dates
    - Relevant certifications/achievements`,
    scoring: `Score 0-100 where:
    - 90-100: All essential components present and detailed
    - 70-89: Most components present, minor omissions
    - 50-69: Key sections present but lacking detail
    - 30-49: Missing several important sections
    - 0-29: Severely incomplete`,
    examples: [
      {
        complete: 'Full contact info, summary, experience with dates, education, skills, certifications',
        incomplete: 'Missing dates, no summary, incomplete contact info'
      }
    ]
  },

  relevance: {
    name: 'Role Relevance',
    criteria: `Evaluate alignment with target role:
    - Skills match job requirements
    - Experience relevance to position
    - Industry/domain alignment
    - Appropriate seniority level
    - Transferable skills highlighted`,
    scoring: `Score 0-100 where:
    - 90-100: Perfect alignment with role requirements
    - 70-89: Strong alignment with minor gaps
    - 50-69: Moderate relevance, some repositioning needed
    - 30-49: Limited relevance, significant gaps
    - 0-29: Poor fit for target role`,
    examples: [
      {
        relevant: 'Frontend developer applying for React role with 3 years React experience',
        irrelevant: 'Backend developer with no frontend experience applying for UI role'
      }
    ]
  },

  requirements: {
    name: 'Requirements Match',
    criteria: `Match against specific job requirements:
    - Required skills coverage
    - Minimum experience met
    - Education requirements satisfied
    - Certification requirements
    - Location/visa requirements addressed`,
    scoring: `Score 0-100 where:
    - 90-100: Exceeds all requirements
    - 70-89: Meets all requirements
    - 50-69: Meets most requirements
    - 30-49: Meets some requirements
    - 0-29: Fails to meet key requirements`,
    examples: [
      {
        meets: 'Has required 5+ years experience, AWS certification, and security clearance',
        fails: 'Only 2 years experience when 5+ required, missing key certifications'
      }
    ]
  }
};

/**
 * Batch evaluation prompt template
 * @type {string}
 */
const BATCH_EVALUATION_TEMPLATE = `Evaluate the following resume for the {{jobTitle}} position in the {{industry}} industry.

{{#if jobRequirements}}
Job Requirements:
{{#each jobRequirements}}
- {{.}}
{{/each}}
{{/if}}

Resume Content:
---
{{resumeContent}}
---

Provide a comprehensive evaluation using ALL of the following critics. Each critic should be evaluated independently with its own score and feedback.

CRITICS TO EVALUATE:
{{#each critics}}
{{@index}}. {{name}} - {{criteria}}
   Scoring: {{scoring}}
{{/each}}

RESPONSE FORMAT:
You must respond with valid JSON that matches this exact structure:

{
  "evaluations": [
    {
      "critic": "keyword",
      "score": 75,
      "feedback": "The resume includes relevant technical keywords like 'React', 'Node.js', and 'AWS'. However, it lacks industry-specific terms like 'microservices' and 'CI/CD' that appear in the job description. The keyword density is appropriate without stuffing.",
      "improvements": [
        "Add 'microservices architecture' to match job requirements",
        "Include 'CI/CD pipeline' experience if applicable",
        "Use more action verbs like 'architected' and 'optimized'"
      ]
    }
    // ... evaluations for all critics
  ],
  "overall_score": 72,
  "summary": "This resume shows strong technical experience but needs optimization for the specific role. The candidate demonstrates relevant skills but should better highlight their impact and align keywords with the job description. With targeted improvements, this could be a competitive application.",
  "top_strengths": [
    "Strong technical background in required technologies",
    "Clear demonstration of career progression",
    "Well-formatted and easy to scan"
  ],
  "critical_improvements": [
    "Add quantifiable metrics to all experience bullets",
    "Include more industry-specific keywords",
    "Expand the professional summary to highlight key achievements"
  ]
}

IMPORTANT INSTRUCTIONS:
1. Evaluate EVERY critic listed above
2. Provide specific, actionable feedback for each critic
3. Base scores on the scoring criteria provided
4. Include 2-5 improvement suggestions per critic
5. Calculate overall_score as weighted average based on critic importance
6. Keep feedback constructive and professional
7. Ensure the JSON is valid and parseable`;

/**
 * Example evaluation response for few-shot learning
 * @type {Object}
 */
const EXAMPLE_EVALUATION = {
  evaluations: [
    {
      critic: 'keyword',
      score: 75,
      feedback: 'The resume demonstrates good keyword usage with relevant technical terms. However, it could benefit from more industry-specific terminology to improve ATS compatibility.',
      improvements: [
        'Add more action verbs at the beginning of bullet points',
        'Include specific technologies mentioned in job descriptions',
        'Use industry-standard terminology for better ATS matching'
      ]
    }
  ],
  overall_score: 72,
  summary: 'This resume shows strong potential with relevant experience and skills. The main areas for improvement are keyword optimization and quantifying achievements to better demonstrate impact.',
  top_strengths: [
    'Clear technical skills section',
    'Relevant work experience',
    'Good educational background'
  ],
  critical_improvements: [
    'Add quantifiable metrics to achievements',
    'Optimize keywords for ATS systems',
    'Strengthen professional summary'
  ]
};

/**
 * Get critic by name
 * @param {string} criticName - Name of the critic
 * @returns {Object} Critic definition
 */
const getCritic = curry(criticName => prop(criticName, CRITICS));

/**
 * Get critics for evaluation
 * @param {Array<string>} criticNames - Array of critic names
 * @returns {Array<Object>} Array of critic definitions
 */
const getCritics = curry(criticNames => pipe(
  map(getCritic),
  map(critic => critic || null),
  filter(critic => critic !== null)
)(criticNames));

/**
 * Format critic for prompt
 * @param {Object} critic - Critic definition
 * @returns {Object} Formatted critic
 */
const formatCriticForPrompt = critic => ({
  name: critic.name,
  criteria: critic.criteria,
  scoring: critic.scoring
});

/**
 * Build evaluation context
 * @param {Object} options - Evaluation options
 * @returns {Object} Context for template rendering
 */
const buildEvaluationContext = curry(options => {
  const { jobTitle, industry, jobRequirements, resumeContent, enabledCritics } = options;
  const critics = getCritics(enabledCritics || Object.keys(CRITICS));

  return {
    jobTitle: jobTitle || 'unspecified position',
    industry: industry || 'general',
    jobRequirements: jobRequirements || [],
    resumeContent,
    critics: map(formatCriticForPrompt, critics)
  };
});

/**
 * Prompt fragments for reusable components
 * @type {Object}
 */
const PROMPT_FRAGMENTS = {
  jsonInstruction: 'Respond ONLY with valid JSON. Do not include any text before or after the JSON object.',
  constructiveTone: 'Maintain a professional, encouraging tone while providing honest feedback.',
  actionableAdvice: 'Every piece of feedback should be specific and actionable.',
  scoringConsistency: 'Apply scoring criteria consistently across all evaluations.'
};

/**
 * Industry-specific context templates
 * @type {Object}
 */
const INDUSTRY_CONTEXTS = {
  technology: {
    keywords: ['agile', 'scrum', 'CI/CD', 'cloud', 'microservices', 'API', 'DevOps'],
    focus: 'Technical skills, project impact, and modern development practices'
  },
  finance: {
    keywords: ['compliance', 'risk management', 'analysis', 'reporting', 'regulatory'],
    focus: 'Attention to detail, analytical skills, and regulatory knowledge'
  },
  healthcare: {
    keywords: ['patient care', 'HIPAA', 'clinical', 'EMR', 'compliance', 'safety'],
    focus: 'Patient outcomes, compliance, and healthcare technology'
  },
  marketing: {
    keywords: ['ROI', 'campaign', 'analytics', 'brand', 'digital', 'SEO', 'conversion'],
    focus: 'Measurable results, creativity, and data-driven decisions'
  }
};

/**
 * Get industry context
 * @param {string} industry - Industry name
 * @returns {Object} Industry-specific context
 */
const getIndustryContext = curry(industry => prop(industry.toLowerCase(), INDUSTRY_CONTEXTS)
  || { keywords: [], focus: 'Professional experience and achievements' });

module.exports = {
  // Core prompts
  SYSTEM_PROMPT,
  BATCH_EVALUATION_TEMPLATE,
  OUTPUT_SCHEMA,

  // Critics
  CRITICS,
  getCritic,
  getCritics,

  // Context builders
  buildEvaluationContext,
  getIndustryContext,

  // Utilities
  PROMPT_FRAGMENTS,
  INDUSTRY_CONTEXTS,
  EXAMPLE_EVALUATION,

  // Formatting helpers
  formatCriticForPrompt
};
