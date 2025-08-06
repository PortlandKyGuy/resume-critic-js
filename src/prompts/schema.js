/**
 * @module prompts/schema
 * @description JSON schema generator for structured LLM outputs with validation support
 */

const { curry, merge } = require('ramda');
const { logger } = require('../utils/logger');

/**
 * Base evaluation response schema
 * @type {Object}
 */
const BASE_EVALUATION_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['evaluations', 'overall_score', 'summary'],
  properties: {
    evaluations: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['critic', 'score', 'feedback', 'improvements'],
        properties: {
          critic: {
            type: 'string',
            description: 'Name of the critic that performed this evaluation'
          },
          score: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Numeric score from 0 to 100'
          },
          feedback: {
            type: 'string',
            minLength: 50,
            maxLength: 500,
            description: 'Detailed feedback about this aspect of the resume'
          },
          improvements: {
            type: 'array',
            minItems: 2,
            maxItems: 5,
            items: {
              type: 'string',
              minLength: 10,
              maxLength: 200
            },
            description: 'Specific, actionable improvement suggestions'
          }
        }
      }
    },
    overall_score: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Overall evaluation score (weighted average of individual scores)'
    },
    summary: {
      type: 'string',
      minLength: 100,
      maxLength: 1000,
      description: 'Overall assessment summary'
    },
    top_strengths: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 10,
        maxLength: 200
      },
      description: 'Key strengths of the resume'
    },
    critical_improvements: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 10,
        maxLength: 200
      },
      description: 'Most important areas for improvement'
    }
  }
};

/**
 * Schema variations for different evaluation contexts
 * @type {Object}
 */
const SCHEMA_VARIATIONS = {
  minimal: {
    description: 'Minimal schema with only essential fields',
    required: ['evaluations', 'overall_score'],
    removeProperties: ['top_strengths', 'critical_improvements']
  },
  extended: {
    description: 'Extended schema with additional analysis fields',
    additionalProperties: {
      industry_fit: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Industry-specific alignment score'
      },
      ats_score: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'ATS compatibility score'
      }
    }
  },

  debug: {
    description: 'Debug schema with metadata fields',
    additionalProperties: {
      debug: {
        type: 'object',
        properties: {
          version: { type: 'string' },
          timestamp: { type: 'string' },
          processing_time: { type: 'number' },
          critic_weights: { type: 'object' }
        }
      }
    }
  }
};

/**
 * Generate schema for specific critics
 * @param {Array<string>} critics - List of critic names
 * @param {Object} baseSchema - Base schema to modify
 * @returns {Object} Modified schema
 */
const generateCriticSchema = curry((critics, baseSchema) => {
  if (!critics || critics.length === 0) {
    return baseSchema;
  }

  // Create a deep copy and modify the enum
  const modifiedSchema = merge({}, baseSchema);

  // Update the enum for critic names
  if (critics && critics.length > 0) {
    const evaluationItems = merge({}, modifiedSchema.properties.evaluations.items);
    const criticProperty = merge({}, evaluationItems.properties.critic);
    const updatedCriticProperty = merge(criticProperty, { enum: critics });
    return merge(modifiedSchema, {
      properties: merge(modifiedSchema.properties, {
        evaluations: merge(modifiedSchema.properties.evaluations, {
          minItems: critics.length,
          maxItems: critics.length,
          items: merge(evaluationItems, {
            properties: merge(evaluationItems.properties, {
              critic: updatedCriticProperty
            })
          })
        })
      })
    });
  }

  return modifiedSchema;
});

/**
 * Apply schema variation
 * @param {string} variation - Variation name
 * @param {Object} baseSchema - Base schema
 * @returns {Object} Modified schema
 */
const applySchemaVariation = curry((variation, baseSchema) => {
  const variationConfig = SCHEMA_VARIATIONS[variation];

  if (!variationConfig) {
    logger.warn(`Unknown schema variation: ${variation}`);
    return baseSchema;
  }

  const schemaWithRequired = variationConfig.required
    ? merge(baseSchema, { required: variationConfig.required })
    : baseSchema;

  // Handle property removal functionally
  const schemaWithRemovals = variationConfig.removeProperties
    ? merge(schemaWithRequired, {
      properties: Object.keys(schemaWithRequired.properties)
        .filter(key => !variationConfig.removeProperties.includes(key))
        .reduce((acc, key) => merge(acc, { [key]: schemaWithRequired.properties[key] }), {})
    })
    : schemaWithRequired;

  // Handle additional properties
  const finalSchema = variationConfig.additionalProperties
    ? merge(schemaWithRemovals, {
      properties: merge(
        schemaWithRemovals.properties,
        variationConfig.additionalProperties
      )
    })
    : schemaWithRemovals;

  return finalSchema;
});

/**
 * Generate parsing instructions for LLM
 * @param {Object} schema - JSON schema
 * @returns {string} Parsing instructions
 */
const generateParsingInstructions = curry(schema => {
  const instructions = [
    'Your response must be valid JSON that can be parsed by JSON.parse().',
    'Do not include any text before or after the JSON object.',
    'Ensure all required fields are present.',
    ''
  ];

  // Add field-specific instructions
  if (schema.properties.evaluations) {
    instructions.push(`Include exactly ${schema.properties.evaluations.minItems || 'all'} evaluations.`);
  }

  if (schema.properties.overall_score) {
    instructions.push('Calculate overall_score as a weighted average of individual scores.');
  }

  if (schema.properties.improvements) {
    instructions.push('Provide specific, actionable improvements for each evaluation.');
  }

  return instructions.join('\n');
});

/**
 * Validate response against schema
 * @param {Object} schema - JSON schema
 * @param {Object} response - Response to validate
 * @returns {Object} Validation result
 */
const validateResponse = curry((schema, response) => {
  const errors = [];

  // Check top-level required fields
  schema.required.forEach(field => {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate evaluations array
  if (response.evaluations !== undefined) {
    if (!Array.isArray(response.evaluations)) {
      errors.push('evaluations must be an array');
    } else {
      // Check min/max items
      const { minItems, maxItems } = schema.properties.evaluations;

      if (minItems && response.evaluations.length < minItems) {
        errors.push(`evaluations must have at least ${minItems} items`);
      }

      if (maxItems && response.evaluations.length > maxItems) {
        errors.push(`evaluations must have at most ${maxItems} items`);
      }

      // Validate each evaluation
      response.evaluations.forEach((evaluation, index) => {
        const itemSchema = schema.properties.evaluations.items;

        // Check required fields
        itemSchema.required.forEach(field => {
          if (!(field in evaluation)) {
            errors.push(`Evaluation ${index}: missing required field '${field}'`);
          }
        });

        // Check score range
        if (typeof evaluation.score === 'number') {
          if (evaluation.score < 0 || evaluation.score > 100) {
            errors.push(`Evaluation ${index}: score must be between 0 and 100`);
          }
        } else if (evaluation.score !== undefined) {
          errors.push(`Evaluation ${index}: score must be a number`);
        }
      });
    }
  }

  // Check overall_score
  if (response.overall_score !== undefined) {
    if (typeof response.overall_score !== 'number') {
      errors.push('overall_score must be a number');
    } else if (response.overall_score < 0 || response.overall_score > 100) {
      errors.push('overall_score must be between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
});

/**
 * Create example response matching schema
 * @param {Object} schema - JSON schema
 * @param {Array<string>} critics - Critic names
 * @returns {Object} Example response
 */
const createExampleResponse = curry((critics, schema) => {
  const evaluations = (critics || ['keyword']).map(critic => ({
    critic,
    score: 75,
    feedback: `This is detailed feedback about the ${critic} aspect of the resume. `
      + 'It provides specific observations and analysis.',
    improvements: [
      `First specific improvement suggestion for ${critic}`,
      'Second actionable recommendation to enhance this aspect'
    ]
  }));

  const example = {
    evaluations,
    overall_score: 75,
    summary: 'This resume demonstrates strong qualifications with room for improvement. '
      + 'The candidate shows relevant experience and skills but could enhance their '
      + 'presentation by implementing the suggested improvements.'
  };

  // Add optional fields if in schema
  const exampleWithOptionals = schema.properties.top_strengths
    ? merge(example, {
      top_strengths: [
        'Strong technical background in relevant technologies',
        'Clear demonstration of career progression'
      ]
    })
    : example;

  return schema.properties.critical_improvements
    ? merge(exampleWithOptionals, {
      critical_improvements: [
        'Add more quantifiable achievements to experience section',
        'Optimize keywords for ATS compatibility'
      ]
    })
    : exampleWithOptionals;
});

/**
 * Create schema with custom constraints
 * @param {Object} constraints - Custom constraints
 * @returns {Object} Modified schema
 */
const createConstrainedSchema = curry(constraints => {
  const baseSchema = { ...BASE_EVALUATION_SCHEMA };

  const constrainedSchema = merge(baseSchema, {
    properties: merge(baseSchema.properties, {
      feedback: merge(baseSchema.properties.feedback || {}, {
        minLength: constraints.minFeedbackLength || 50,
        maxLength: constraints.maxFeedbackLength || 500
      }),
      summary: merge(baseSchema.properties.summary || {}, {
        minLength: constraints.minSummaryLength || 100,
        maxLength: constraints.maxSummaryLength || 1000
      }),
      evaluations: merge(baseSchema.properties.evaluations || {}, {
        minItems: constraints.minEvaluations || 1,
        maxItems: constraints.maxEvaluations || 10
      })
    })
  });

  return constrainedSchema;
});

/**
 * Get schema for specific provider
 * @param {string} provider - LLM provider name
 * @param {Object} baseSchema - Base schema
 * @returns {Object} Provider-specific schema
 */
const getProviderSchema = curry((provider, baseSchema) => {
  const providerModifications = {
    openai: {
      // OpenAI works well with standard JSON schema
    },
    gemini: {
      // Gemini may need simplified schemas
      removeComplexValidation: true
    },
    ollama: {
      // Ollama benefits from examples
      includeExamples: true
    }
  };

  const mods = providerModifications[provider] || {};

  if (mods.removeComplexValidation) {
    // Remove complex validation rules for better compatibility
    const simplified = merge({}, baseSchema);
    // Remove minLength/maxLength constraints
    const cleanedProperties = Object.keys(simplified.properties).reduce((acc, key) => {
      const prop = simplified.properties[key];
      if (prop.type === 'string') {
        const { minLength, maxLength, ...rest } = prop;
        return merge(acc, { [key]: rest });
      }
      return merge(acc, { [key]: prop });
    }, {});
    return merge(simplified, { properties: cleanedProperties });
  }

  return baseSchema;
});

module.exports = {
  // Base schemas
  BASE_EVALUATION_SCHEMA,
  SCHEMA_VARIATIONS,

  // Schema generators
  generateCriticSchema,
  applySchemaVariation,
  createConstrainedSchema,
  getProviderSchema,

  // Utilities
  generateParsingInstructions,
  validateResponse,
  createExampleResponse
};
