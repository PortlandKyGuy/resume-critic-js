/**
 * @module prompts/composer
 * @description Functional prompt composition engine for combining base prompts with critic-specific instructions
 */

const { curry, pipe, map, prop, merge, pick, evolve, always, identity } = require('ramda');
const { memoize, tryCatch } = require('../utils/functional');
const { createRenderer } = require('./template');
const {
  SYSTEM_PROMPT,
  BATCH_EVALUATION_TEMPLATE,
  OUTPUT_SCHEMA,
  buildEvaluationContext,
  getIndustryContext
} = require('./base');

/**
 * Prompt composition options
 * @typedef {Object} CompositionOptions
 * @property {string} jobTitle - Target job title
 * @property {string} industry - Industry context
 * @property {Array<string>} jobRequirements - Specific job requirements
 * @property {string} resumeContent - Resume text to evaluate
 * @property {Array<string>} enabledCritics - Critics to include
 * @property {Object} customizations - Custom prompt overrides
 * @property {boolean} debug - Enable debug mode
 * @property {string} version - Prompt version to use
 */

/**
 * Composed prompt result
 * @typedef {Object} ComposedPrompt
 * @property {string} system - System prompt
 * @property {string} user - User prompt
 * @property {Object} schema - Expected output schema
 * @property {Object} metadata - Composition metadata
 */

/**
 * Register default partials for template system
 */
const registerDefaultPartials = () => {
  const partials = {
    jsonFormat: '```json\n{{content}}\n```',
    bulletList: '{{#each items}}\n• {{.}}\n{{/each}}',
    numberedList: '{{#each items}}\n{{@index}}. {{.}}\n{{/each}}',
    criticBlock: `{{name}}:
- Criteria: {{criteria}}
- Scoring: {{scoring}}
{{#if examples}}
Examples:
{{#each examples}}
  - Good: {{good}}
  - Bad: {{bad}}
{{/each}}
{{/if}}`
  };

  // Create a renderer with these partials
  return createRenderer(partials);
};

// Initialize renderer with partials
const templateRenderer = registerDefaultPartials();

/**
 * Enhance context with industry-specific information
 * @param {Object} context - Base evaluation context
 * @returns {Object} Enhanced context
 */
const enhanceContextWithIndustry = curry(context => {
  const industryInfo = getIndustryContext(context.industry);
  return merge(context, {
    industryKeywords: industryInfo.keywords,
    industryFocus: industryInfo.focus
  });
});

/**
 * Apply customizations to prompt context
 * @param {Object} customizations - Custom overrides
 * @param {Object} context - Evaluation context
 * @returns {Object} Customized context
 */
const applyCustomizations = curry((customizations, context) => {
  if (!customizations || Object.keys(customizations).length === 0) {
    return context;
  }

  return evolve({
    jobTitle: customizations.jobTitle ? always(customizations.jobTitle) : identity,
    industry: customizations.industry ? always(customizations.industry) : identity,
    jobRequirements: customizations.additionalRequirements
      ? reqs => [...reqs, ...customizations.additionalRequirements] : identity,
    critics: customizations.criticOverrides
      ? map(critic => merge(critic, prop(critic.name, customizations.criticOverrides) || {})) : identity
  })(context);
});

/**
 * Build debug metadata for prompt inspection
 * @param {Object} options - Composition options
 * @param {Object} context - Final context
 * @returns {Object} Debug metadata
 */
const buildDebugMetadata = curry((options, context) => ({
  timestamp: new Date().toISOString(),
  version: options.version || 'default',
  enabledCritics: map(prop('name'), context.critics),
  industryContext: pick(['industry', 'industryKeywords', 'industryFocus'], context),
  customizationsApplied: !!options.customizations,
  tokenEstimate: Math.ceil(JSON.stringify(context).length / 4)
}));

/**
 * Compose system prompt with enhancements
 * @param {Object} options - Composition options
 * @returns {string} Composed system prompt
 */
const composeSystemPrompt = curry(options => {
  const baseSystem = SYSTEM_PROMPT;
  const industryContext = getIndustryContext(options.industry);

  // Add industry-specific expertise if provided
  const industryAddendum = options.industry && options.industry !== 'general'
    ? `\n\nFor ${options.industry} roles, you pay special attention to: ${industryContext.focus}`
    : '';

  // Add debug instructions if enabled
  const debugAddendum = options.debug
    ? '\n\nDEBUG MODE: Include additional detail in your reasoning and be explicit about your '
      + 'scoring calculations.'
    : '';

  return baseSystem + industryAddendum + debugAddendum;
});

/**
 * Compose user prompt from template and context
 * @param {Object} context - Evaluation context
 * @returns {string} Composed user prompt
 */
const composeUserPrompt = curry(context => templateRenderer(BATCH_EVALUATION_TEMPLATE, context));

/**
 * Build output schema with optional extensions
 * @param {Object} options - Composition options
 * @returns {Object} Output schema
 */
const buildOutputSchema = curry(options => {
  const baseSchema = { ...OUTPUT_SCHEMA };
  // Build modified schema functionally
  const withDebug = options.debug
    ? merge(baseSchema, {
      properties: merge(baseSchema.properties, {
        debug: {
          type: 'object',
          properties: {
            scoringRationale: { type: 'object' },
            confidenceScores: { type: 'object' },
            processingNotes: { type: 'array', items: { type: 'string' } }
          }
        }
      })
    })
    : baseSchema;

  // Filter critics in schema enum
  if (options.enabledCritics) {
    return evolve({
      properties: evolve({
        evaluations: evolve({
          items: evolve({
            properties: evolve({
              critic: merge(prop('critic', withDebug.properties.evaluations.items.properties), {
                enum: options.enabledCritics
              })
            })
          })
        })
      })
    })(withDebug);
  }

  return withDebug;
});

/**
 * Main composition pipeline
 * @param {CompositionOptions} options - Composition options
 * @returns {ComposedPrompt} Composed prompt
 */
const composePrompt = curry(options => {
  // Build base context
  const baseContext = buildEvaluationContext(options);

  // Enhancement pipeline
  const enhancedContext = pipe(
    enhanceContextWithIndustry,
    applyCustomizations(options.customizations || {})
  )(baseContext);

  // Compose prompts
  const systemPrompt = composeSystemPrompt(options);
  const userPrompt = composeUserPrompt(enhancedContext);
  const outputSchema = buildOutputSchema(options);

  // Build metadata if debug enabled
  const metadata = options.debug ? buildDebugMetadata(options, enhancedContext) : {};

  return {
    system: systemPrompt,
    user: userPrompt,
    schema: outputSchema,
    metadata
  };
});

/**
 * Create a reusable prompt composer with partial options
 * @param {Object} defaultOptions - Default options for the composer
 * @returns {Function} Composer function
 */
const createComposer = curry(defaultOptions => specificOptions => {
  const mergedOptions = merge(defaultOptions, specificOptions);
  return composePrompt(mergedOptions);
});

/**
 * Estimate token count for prompt (rough approximation)
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
const estimateTokenCount = text => Math.ceil(text.length / 4);

/**
 * Compose prompt for specific critic subset
 * @param {Array<string>} critics - Critic names
 * @param {Object} baseOptions - Base composition options
 * @returns {ComposedPrompt} Composed prompt
 */
const composeForCritics = curry((critics, baseOptions) => composePrompt(
  merge(baseOptions, { enabledCritics: critics })
));

/**
 * Compose prompt for specific industry
 * @param {string} industry - Industry name
 * @param {Object} baseOptions - Base composition options
 * @returns {ComposedPrompt} Composed prompt
 */
const composeForIndustry = curry((industry, baseOptions) => composePrompt(merge(baseOptions, { industry })));

/**
 * Create a version-specific composer
 * @param {string} version - Prompt version
 * @returns {Function} Version-specific composer
 */
const versionedComposer = curry(version => options => composePrompt(merge(options, { version })));

/**
 * Validate composition options
 * @param {Object} options - Options to validate
 * @returns {Object} Validated options
 * @throws {Error} If validation fails
 */
const validateOptions = options => {
  if (!options.resumeContent) {
    throw new Error('resumeContent is required for prompt composition');
  }

  if (options.enabledCritics && !Array.isArray(options.enabledCritics)) {
    throw new Error('enabledCritics must be an array');
  }

  return options;
};

/**
 * Safe prompt composition with error handling
 */
const safeComposePrompt = tryCatch(
  pipe(validateOptions, composePrompt),
  (error, options) => ({
    error: error.message,
    fallback: {
      system: SYSTEM_PROMPT,
      user: `Evaluate this resume:\n\n${options.resumeContent || 'No content provided'}`,
      schema: OUTPUT_SCHEMA,
      metadata: { error: true, message: error.message }
    }
  })
);

/**
 * Memoized composers for performance
 */
const memoizedComposePrompt = memoize(composePrompt);
const memoizedComposeForCritics = memoize(composeForCritics);
const memoizedComposeForIndustry = memoize(composeForIndustry);

/**
 * Prompt inspection utilities
 */
const inspectPrompt = composedPrompt => ({
  systemLength: composedPrompt.system.length,
  userLength: composedPrompt.user.length,
  totalLength: composedPrompt.system.length + composedPrompt.user.length,
  estimatedTokens: estimateTokenCount(composedPrompt.system + composedPrompt.user),
  schemaProperties: Object.keys(composedPrompt.schema.properties),
  metadata: composedPrompt.metadata
});

/**
 * Extract prompt for specific provider optimizations
 * @param {string} provider - LLM provider name
 * @param {ComposedPrompt} composedPrompt - Composed prompt
 * @returns {Object} Provider-optimized prompt
 */
const optimizeForProvider = curry((provider, composedPrompt) => {
  const optimizations = {
    openai: {
      messages: [
        { role: 'system', content: composedPrompt.system },
        { role: 'user', content: composedPrompt.user }
      ],
      response_format: { type: 'json_object' }
    },
    gemini: {
      systemInstruction: composedPrompt.system,
      contents: [{ role: 'user', parts: [{ text: composedPrompt.user }] }],
      generationConfig: { responseMimeType: 'application/json' }
    },
    ollama: {
      system: composedPrompt.system,
      prompt: composedPrompt.user,
      format: 'json'
    },
    mock: {
      prompt: composedPrompt,
      schema: composedPrompt.schema
    }
  };

  return optimizations[provider] || composedPrompt;
});

module.exports = {
  // Main composition functions
  composePrompt,
  safeComposePrompt,
  createComposer,

  // Specialized composers
  composeForCritics,
  composeForIndustry,
  versionedComposer,

  // Memoized versions
  memoizedComposePrompt,
  memoizedComposeForCritics,
  memoizedComposeForIndustry,

  // Utilities
  validateOptions,
  inspectPrompt,
  optimizeForProvider,
  estimateTokenCount,

  // Context enhancement
  enhanceContextWithIndustry,
  applyCustomizations,

  // Prompt components
  composeSystemPrompt,
  composeUserPrompt,
  buildOutputSchema,
  buildDebugMetadata
};
