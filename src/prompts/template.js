/**
 * @module prompts/template
 * @description Template engine for dynamic prompt generation with variable substitution
 */

const { curry } = require('ramda');
const { memoize } = require('../utils/functional');

/**
 * Token types for template parsing
 */
const TokenType = {
  TEXT: 'TEXT',
  VARIABLE: 'VARIABLE',
  IF_START: 'IF_START',
  IF_END: 'IF_END',
  EACH_START: 'EACH_START',
  EACH_END: 'EACH_END',
  PARTIAL: 'PARTIAL'
};

/**
 * Parse default value from variable expression
 * @param {string} expr - Variable expression
 * @returns {Object} Parsed variable and default value
 */
const parseDefaultValue = expr => {
  const trimmed = expr.trim();
  const match = trimmed.match(/^(.+?)\s*\|\s*"([^"]+)"$/);

  if (match) {
    return {
      path: match[1].trim(),
      defaultValue: match[2]
    };
  }

  return {
    path: trimmed,
    defaultValue: undefined
  };
};

/**
 * Get value from context using dot notation path
 * @param {string} path - Dot notation path
 * @param {Object} context - Context object
 * @returns {*} Value at path or undefined
 */
const getValueFromPath = curry((path, context) => {
  const { path: cleanPath, defaultValue } = parseDefaultValue(path);

  // Handle special loop variable
  if (cleanPath === '.' || cleanPath === 'this') {
    const value = context['.'] !== undefined ? context['.'] : context.this;
    return value !== undefined ? value : defaultValue;
  }

  const keys = cleanPath.split('.');

  // First try direct lookup
  const value = keys.reduce((acc, key) => {
    if (acc && typeof acc === 'object') {
      return acc[key];
    }
    return undefined;
  }, context);

  // If not found and we're in a loop context, try the loop item
  if (value === undefined && context['.'] && keys.length > 0) {
    const loopValue = keys.reduce((acc, key) => {
      if (acc && typeof acc === 'object') {
        return acc[key];
      }
      return undefined;
    }, context['.']);

    return loopValue !== undefined ? loopValue : defaultValue;
  }

  return value !== undefined ? value : defaultValue;
});

/**
 * Tokenize template string into tokens
 * @param {string} template - Template string to tokenize
 * @returns {Array} Array of tokens
 */
const tokenize = template => {
  const regex = /\{\{([#/]?)(if|each|>)?[\s]*([^}]*?)[\s]*\}\}/g;
  const matches = [...template.matchAll(regex)];

  // Helper to determine token type
  const getTokenType = (prefix, directive) => {
    if (prefix === '#' && directive === 'if') return TokenType.IF_START;
    if (prefix === '/' && directive === 'if') return TokenType.IF_END;
    if (prefix === '#' && directive === 'each') return TokenType.EACH_START;
    if (prefix === '/' && directive === 'each') return TokenType.EACH_END;
    if (prefix === '' && directive === '>') return TokenType.PARTIAL;
    if (!prefix && !directive) return TokenType.VARIABLE;
    return null;
  };

  // Build tokens array
  const tokens = [];
  let lastIndex = 0;

  matches.forEach(match => {
    const [fullMatch, prefix, directive, content] = match;
    const matchIndex = match.index;

    // Add text before match
    if (matchIndex > lastIndex) {
      tokens.push({
        type: TokenType.TEXT,
        value: template.slice(lastIndex, matchIndex),
        raw: template.slice(lastIndex, matchIndex)
      });
    }

    // Add token
    const tokenType = getTokenType(prefix, directive);
    if (tokenType) {
      tokens.push({
        type: tokenType,
        value: tokenType === TokenType.IF_END || tokenType === TokenType.EACH_END ? '' : content.trim(),
        raw: fullMatch
      });
    }

    lastIndex = matchIndex + fullMatch.length;
  });

  // Add remaining text
  if (lastIndex < template.length) {
    tokens.push({
      type: TokenType.TEXT,
      value: template.slice(lastIndex),
      raw: template.slice(lastIndex)
    });
  }

  return tokens;
};

/**
 * Build AST from tokens
 * @param {Array} tokens - Array of tokens
 * @returns {Array} AST nodes
 */
const buildAST = tokens => {
  const ast = [];
  const stack = [ast];

  tokens.forEach(token => {
    const current = stack[stack.length - 1];

    switch (token.type) {
      case TokenType.TEXT:
      case TokenType.VARIABLE:
      case TokenType.PARTIAL:
        current.push(token);
        break;

      case TokenType.IF_START: {
        const ifBlock = {
          type: 'IF_BLOCK',
          condition: token.value,
          trueBranch: [],
          falseBranch: []
        };
        current.push(ifBlock);
        stack.push(ifBlock.trueBranch);
        break;
      }

      case TokenType.IF_END:
        stack.pop();
        break;

      case TokenType.EACH_START: {
        const eachBlock = {
          type: 'EACH_BLOCK',
          collection: token.value,
          body: []
        };
        current.push(eachBlock);
        stack.push(eachBlock.body);
        break;
      }

      case TokenType.EACH_END:
        stack.pop();
        break;

      default:
        break;
    }
  });

  return ast;
};

/**
 * Compile template to AST
 * @param {string} template - Template string
 * @returns {Array} AST
 */
const compileTemplate = memoize(template => {
  const tokens = tokenize(template);
  return buildAST(tokens);
});

// Forward declaration for mutual recursion
/* eslint-disable prefer-const, fp/no-let, fp/no-mutation */
let evaluateNode;
let render;

/**
 * Render template with context
 * @param {string} template - Template string
 * @param {Object} context - Data context
 * @param {Object} partials - Partial templates
 * @returns {string} Rendered template
 */
render = (template, context = {}, partials = {}) => {
  const ast = compileTemplate(template);
  return ast.map(node => evaluateNode(partials, context, node)).join('');
};

/**
 * Evaluate AST node
 * @param {Object} node - AST node
 * @param {Object} context - Data context
 * @param {Object} partials - Partial templates
 * @returns {string} Rendered string
 */
evaluateNode = curry((partials, context, node) => {
  /* eslint-enable prefer-const, fp/no-let, fp/no-mutation */
  switch (node.type) {
    case TokenType.TEXT:
      return node.value;

    case TokenType.VARIABLE: {
      const value = getValueFromPath(node.value, context);
      return value !== undefined && value !== null ? String(value) : '';
    }

    case TokenType.PARTIAL: {
      const partial = partials[node.value];
      if (!partial) {
        throw new Error(`Partial '${node.value}' not found`);
      }
      return render(partial, context, partials);
    }

    case 'IF_BLOCK': {
      const condition = getValueFromPath(node.condition, context);
      if (condition) {
        return node.trueBranch
          .map(child => evaluateNode(partials, context, child))
          .join('');
      }
      return '';
    }

    case 'EACH_BLOCK': {
      const collection = getValueFromPath(node.collection, context);
      if (!Array.isArray(collection)) return '';

      return collection
        .map((item, index) => {
          const itemContext = {
            ...context,
            this: item,
            '.': item,
            '@index': index,
            '@first': index === 0,
            '@last': index === collection.length - 1
          };
          return node.body
            .map(child => evaluateNode(partials, itemContext, child))
            .join('');
        })
        .join('');
    }

    default:
      return '';
  }
});

/**
 * Validate template syntax
 * @param {string} template - Template to validate
 * @returns {Object} Validation result
 */
const validateTemplate = template => {
  const errors = [];
  const depths = { if: 0, each: 0 };

  try {
    const tokens = tokenize(template);

    tokens.forEach(token => {
      /* eslint-disable fp/no-mutation */
      switch (token.type) {
        case TokenType.IF_START:
          depths.if += 1;
          break;
        case TokenType.IF_END:
          depths.if -= 1;
          if (depths.if < 0) {
            errors.push('Unmatched {{/if}} tag');
          }
          break;
        case TokenType.EACH_START:
          depths.each += 1;
          break;
        case TokenType.EACH_END:
          depths.each -= 1;
          if (depths.each < 0) {
            errors.push('Unmatched {{/each}} tag');
          }
          break;
        default:
          break;
      }
      /* eslint-enable fp/no-mutation */
    });

    if (depths.if > 0) {
      errors.push(`${depths.if} unclosed {{#if}} tag(s)`);
    }
    if (depths.each > 0) {
      errors.push(`${depths.each} unclosed {{#each}} tag(s)`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Parse error: ${error.message}`]
    };
  }
};

/**
 * Create renderer with partials
 * @param {Object} partials - Partial templates
 * @returns {Function} Render function
 */
const createRenderer = (partials = {}) => (template, context) => {
  // Validate template before rendering
  const validation = validateTemplate(template);
  if (!validation.valid) {
    throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
  }

  return render(template, context, partials);
};

/**
 * Extract variable names from template
 * @param {string} template - Template string
 * @returns {Array<string>} Variable names
 */
const extractVariables = template => {
  const variables = new Set();
  const tokens = tokenize(template);

  tokens.forEach(token => {
    if (token.type === TokenType.VARIABLE) {
      const { path } = parseDefaultValue(token.value);
      variables.add(path);
    } else if (token.type === TokenType.IF_START || token.type === TokenType.EACH_START) {
      variables.add(token.value);
    }
  });

  return Array.from(variables);
};

/**
 * Safe render with validation
 * @param {Object} partials - Partials
 * @param {string} template - Template
 * @param {Object} context - Context
 * @returns {Object} Result
 */
const safeRender = curry((partials, template, context) => {
  const validation = validateTemplate(template);

  if (!validation.valid) {
    return {
      success: false,
      error: `Template validation failed: ${validation.errors.join(', ')}`,
      errors: validation.errors
    };
  }

  try {
    const result = render(template, context, partials);
    return {
      success: true,
      result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

module.exports = {
  // Core functions
  render,
  createRenderer,
  compileTemplate,

  // Validation
  validateTemplate,
  safeRender,

  // Utilities
  tokenize,
  buildAST,
  evaluateNode,
  getValueFromPath,
  parseDefaultValue,
  extractVariables,

  // Constants
  TokenType
};
