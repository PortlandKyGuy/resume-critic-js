/**
 * @module prompts/critics/completeness
 * @description Completeness check critic prompt generator
 */

const { curry, pipe, map, filter, includes } = require('ramda');

/**
 * Completeness critic configuration
 */
const COMPLETENESS_CRITIC = {
  name: 'completeness',
  displayName: 'Completeness Check',
  description: 'Evaluates presence of essential resume components',

  criteria: {
    primary: [
      'Contact information',
      'Professional summary',
      'Work experience',
      'Education',
      'Skills section'
    ],
    secondary: [
      'Certifications',
      'Achievements/Awards',
      'Professional links',
      'References notation',
      'Dates completeness'
    ]
  },

  scoring: {
    excellent: {
      range: [90, 100],
      description: 'All essential components present with comprehensive details'
    },
    good: {
      range: [70, 89],
      description: 'Most components present with good detail level'
    },
    adequate: {
      range: [50, 69],
      description: 'Basic components present but lacking some details'
    },
    poor: {
      range: [30, 49],
      description: 'Missing several important sections or details'
    },
    failing: {
      range: [0, 29],
      description: 'Severely incomplete, missing critical sections'
    }
  },

  prompts: {
    analysis: `Check for essential resume components:
1. Verify complete contact information
2. Check for professional summary/objective
3. Validate work experience with dates
4. Confirm education details
5. Review skills section completeness
6. Note any missing standard sections`,

    scoring: `Score completeness from 0-100 based on:
- 25%: Contact info completeness
- 20%: Work experience details
- 15%: Professional summary presence
- 15%: Education information
- 15%: Skills section
- 10%: Additional relevant sections`
  }
};

/**
 * Essential resume sections
 */
const ESSENTIAL_SECTIONS = {
  contact: {
    required: ['name', 'email', 'phone'],
    optional: ['linkedin', 'location', 'portfolio']
  },
  experience: {
    required: ['title', 'company', 'dates', 'description'],
    optional: ['location', 'achievements']
  },
  education: {
    required: ['degree', 'institution', 'graduation'],
    optional: ['gpa', 'honors', 'relevant_coursework']
  }
};

/**
 * Generate completeness analysis prompt
 * @param {Object} context - Evaluation context
 * @returns {string} Analysis prompt
 */
const generateCompletenessAnalysisPrompt = curry(context => {
  const { jobTitle, seniorityLevel, requiresCertification } = context;

  let prompt = COMPLETENESS_CRITIC.prompts.analysis;

  if (seniorityLevel === 'entry') {
    prompt += '\n\nFor entry-level positions, also check:';
    prompt += '\n- Academic projects or internships';
    prompt += '\n- Relevant coursework';
    prompt += '\n- Extracurricular activities';
  } else if (seniorityLevel === 'senior' || seniorityLevel === 'executive') {
    prompt += '\n\nFor senior positions, also verify:';
    prompt += '\n- Leadership experience';
    prompt += '\n- Board positions or advisory roles';
    prompt += '\n- Publications or speaking engagements';
  }

  if (requiresCertification) {
    prompt += '\n\nRequired certifications section is mandatory for this role.';
  }

  return prompt;
});

/**
 * Check section completeness
 * @param {Object} resumeSections - Parsed resume sections
 * @returns {Object} Completeness analysis
 */
const checkSectionCompleteness = curry(resumeSections => {
  const missingSections = [];
  const incompleteSections = [];

  // Check contact information
  if (!resumeSections.contact) {
    missingSections.push('contact');
  } else {
    const missingContact = filter(
      field => !resumeSections.contact[field],
      ESSENTIAL_SECTIONS.contact.required
    );
    if (missingContact.length > 0) {
      incompleteSections.push({ section: 'contact', missing: missingContact });
    }
  }

  // Check experience
  if (!resumeSections.experience || resumeSections.experience.length === 0) {
    missingSections.push('experience');
  }

  // Check education
  if (!resumeSections.education) {
    missingSections.push('education');
  }

  // Check skills
  if (!resumeSections.skills || resumeSections.skills.length === 0) {
    missingSections.push('skills');
  }

  return {
    missingSections,
    incompleteSections,
    completenessScore: Math.max(100 - (missingSections.length * 20) - (incompleteSections.length * 10), 0)
  };
});

/**
 * Generate completeness improvements
 * @param {Object} evaluation - Completeness evaluation result
 * @returns {Array<string>} Improvement suggestions
 */
const generateCompletenessImprovements = curry(evaluation => {
  const improvements = [];
  const { missingSections = [], incompleteSections = [] } = evaluation;

  missingSections.forEach(section => {
    switch (section) {
      case 'contact':
        improvements.push('Add complete contact information including email and phone');
        break;
      case 'summary':
        improvements.push('Include a professional summary highlighting key qualifications');
        break;
      case 'experience':
        improvements.push('Add work experience section with roles and achievements');
        break;
      case 'education':
        improvements.push('Include education details with degree and institution');
        break;
      case 'skills':
        improvements.push('Add a skills section highlighting relevant competencies');
        break;
    }
  });

  incompleteSections.forEach(({ section, missing }) => {
    improvements.push(`Complete ${section} section by adding: ${missing.join(', ')}`);
  });

  return improvements.slice(0, 5);
});

/**
 * Validate date completeness
 * @param {Array<Object>} experiences - Work experiences
 * @returns {Object} Date validation result
 */
const validateDateCompleteness = curry(experiences => {
  const missingDates = filter(exp => !exp.startDate || !exp.endDate, experiences);
  const hasCurrentRole = experiences.some(exp => exp.endDate === 'Present' || exp.isCurrent);

  return {
    allDatesPresent: missingDates.length === 0,
    missingDateCount: missingDates.length,
    hasCurrentRole,
    dateCompletenessScore: missingDates.length === 0 ? 100 : Math.max(100 - (missingDates.length * 25), 0)
  };
});

module.exports = {
  COMPLETENESS_CRITIC,
  ESSENTIAL_SECTIONS,
  generateCompletenessAnalysisPrompt,
  checkSectionCompleteness,
  generateCompletenessImprovements,
  validateDateCompleteness
};
