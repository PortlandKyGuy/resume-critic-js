/**
 * @module prompts/schema
 * @description JSON schema generator for structured LLM outputs with validation support
 */

const { curry, pipe, map, reduce, merge, prop, pick, evolve } = require('ramda');
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
      description: 'Weighted average of all critic scores'
    },
    summary: {
      type: 'string',
      minLength: 100,
      maxLength: 1000,
      description: 'Overall evaluation summary'
    },
    top_strengths: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 10,
        maxLength: 150
      },
      description: 'Key strengths identified in the resume'
    },
    critical_improvements: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      items: {
        type: 'string',
        minLength: 10,
        maxLength: 150
      },
      description: 'Most important areas for improvement'
    }
  }
};

/**
 * Schema variations for different evaluation modes
 * @type {Object}
 */
const SCHEMA_VARIATIONS = {
  minimal: {
    required: ['evaluations', 'overall_score'],
    removeProperties: ['top_strengths', 'critical_improvements']
  },
  detailed: {
    additionalProperties: {
      confidence_scores: {
        type: 'object',
        patternProperties: {
          '^.*$': {
            type: 'number',
            minimum: 0,
            maximum: 1
          }
        }
      },
      processing_time: {
        type: 'number',
        description: 'Time taken to process in milliseconds'
      }
    }
  },
  debug: {
    additionalProperties: {
      debug: {
        type: 'object',
        properties: {
          scoring_rationale: {
            type: 'object',
            description: 'Detailed reasoning for each score'
          },
          confidence_scores: {
            type: 'object',
            description: 'Confidence level for each evaluation'
          },
          processing_notes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Notes about the evaluation process'
          }
        }
      }
    }
  }
};

/**
 * Create schema for specific critics
 * @param {Array<string>} critics - List of critic names
 * @param {Object} baseSchema - Base schema to modify
 * @returns {Object} Modified schema
 */
const createSchemaForCritics = curry((critics, baseSchema) => {
  const modifiedSchema = { ...baseSchema };
  
  // Update the enum for critic names
  if (critics && critics.length > 0) {
    modifiedSchema.properties.evaluations.items.properties.critic.enum = critics;
    modifiedSchema.properties.evaluations.minItems = critics.length;
    modifiedSchema.properties.evaluations.maxItems = critics.length;
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
  
  let modifiedSchema = { ...baseSchema };
  
  // Handle required fields modification
  if (variationConfig.required) {
    modifiedSchema.required = variationConfig.required;
  }
  
  // Handle property removal
  if (variationConfig.removeProperties) {
    variationConfig.removeProperties.forEach(prop => {
      delete modifiedSchema.properties[prop];
    });
  }
  
  // Handle additional properties
  if (variationConfig.additionalProperties) {
    modifiedSchema.properties = merge(
      modifiedSchema.properties,
      variationConfig.additionalProperties
    );
  }
  
  return modifiedSchema;
});

/**
 * Generate parsing instructions for LLM
 * @param {Object} schema - JSON schema
 * @returns {string} Parsing instructions
 */
const generateParsingInstructions = curry((schema) => {
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
 * @param {Object} response - LLM response
 * @param {Object} schema - Expected schema
 * @returns {Object} Validation result
 */
const validateResponse = curry((schema, response) => {
  const errors = [];
  
  // Check required fields
  if (schema.required) {
    schema.required.forEach(field => {
      if (!(field in response)) {
        errors.push(`Missing required field: ${field}`);
      }
    });
  }
  
  // Check evaluations array
  if (response.evaluations) {
    if (!Array.isArray(response.evaluations)) {
      errors.push('evaluations must be an array');
    } else {
      // Check min/max items
      const minItems = schema.properties.evaluations.minItems;
      const maxItems = schema.properties.evaluations.maxItems;
      
      if (minItems && response.evaluations.length < minItems) {
        errors.push(`evaluations must have at least ${minItems} items`);
      }
      
      if (maxItems && response.evaluations.length > maxItems) {
        errors.push(`evaluations must have at most ${maxItems} items`);
      }
      
      // Validate each evaluation
      response.evaluations.forEach((eval, index) => {
        const itemSchema = schema.properties.evaluations.items;
        
        // Check required fields
        itemSchema.required.forEach(field => {
          if (!(field in eval)) {
            errors.push(`Evaluation ${index}: missing required field '${field}'`);
          }
        });
        
        // Check score range
        if (typeof eval.score === 'number') {
          if (eval.score < 0 || eval.score > 100) {
            errors.push(`Evaluation ${index}: score must be between 0 and 100`);
          }
        } else if (eval.score !== undefined) {
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
    feedback: 'This is detailed feedback about the ' + critic + ' aspect of the resume. It provides specific observations and analysis.',
    improvements: [
      'First specific improvement suggestion for ' + critic,
      'Second actionable recommendation to enhance this aspect'
    ]
  }));
  
  const example = {
    evaluations,
    overall_score: 75,
    summary: 'This resume demonstrates strong qualifications with room for improvement. The candidate shows relevant experience and skills but could enhance their presentation by implementing the suggested improvements.'
  };
  
  // Add optional fields if in schema
  if (schema.properties.top_strengths) {
    example.top_strengths = [
      'Strong technical background in relevant technologies',
      'Clear demonstration of career progression'
    ];
  }
  
  if (schema.properties.critical_improvements) {
    example.critical_improvements = [
      'Add quantifiable achievements to experience descriptions',
      'Optimize keyword usage for ATS compatibility'
    ];
  }
  
  return example;
});

/**
 * Generate schema with all options
 * @param {Object} options - Schema generation options
 * @returns {Object} Generated schema
 */
const generateSchema = curry((options = {}) => {
  const { critics, variation, includeExample, strict } = options;
  
  // Start with base schema
  let schema = { ...BASE_EVALUATION_SCHEMA };
  
  // Apply critics if specified
  if (critics) {
    schema = createSchemaForCritics(critics, schema);
  }
  
  // Apply variation if specified
  if (variation) {
    schema = applySchemaVariation(variation, schema);
  }
  
  // Add strict mode constraints
  if (strict) {
    schema.additionalProperties = false;
    schema.properties.evaluations.items.additionalProperties = false;
  }
  
  // Include example if requested
  if (includeExample) {
    schema.examples = [createExampleResponse(critics, schema)];
  }
  
  return schema;
});

/**
 * Convert schema to TypeScript interface (for documentation)
 * @param {Object} schema - JSON schema
 * @returns {string} TypeScript interface definition
 */
const schemaToTypeScript = curry((schema) => {
  const lines = ['interface EvaluationResponse {'];
  
  Object.entries(schema.properties).forEach(([key, prop]) => {
    const required = schema.required && schema.required.includes(key);
    const optional = required ? '' : '?';
    
    let type = 'any';
    if (prop.type === 'string') type = 'string';
    else if (prop.type === 'number') type = 'number';
    else if (prop.type === 'array') {
      if (prop.items && prop.items.type === 'string') {
        type = 'string[]';
      } else {
        type = 'any[]';
      }
    } else if (prop.type === 'object') {
      type = 'Record<string, any>';
    }
    
    lines.push(`  ${key}${optional}: ${type};`);
  });
  
  lines.push('}');
  
  return lines.join('\n');
});

module.exports = {
  // Core schemas
  BASE_EVALUATION_SCHEMA,
  SCHEMA_VARIATIONS,
  
  // Schema generation
  generateSchema,
  createSchemaForCritics,
  applySchemaVariation,
  
  // Utilities
  generateParsingInstructions,
  validateResponse,
  createExampleResponse,
  schemaToTypeScript
};