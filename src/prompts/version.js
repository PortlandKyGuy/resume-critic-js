/**
 * @module prompts/version
 * @description Prompt version management for A/B testing and rollback support
 */

const { curry, pipe, prop, merge, evolve, defaultTo } = require('ramda');
const { memoize } = require('../utils/functional');
const { logger } = require('../utils/logger');
const { getConfig } = require('../utils/config');

/**
 * Prompt version registry
 * @type {Object}
 */
const PROMPT_VERSIONS = {
  v1: {
    id: 'v1',
    name: 'Original',
    description: 'Initial prompt version with basic evaluation',
    created: '2024-01-01',
    status: 'stable',
    changes: [],
    prompts: {
      systemModifier: '',
      scoringEmphasis: 'balanced',
      improvementCount: 3,
      responseStyle: 'professional'
    }
  },

  v2: {
    id: 'v2',
    name: 'Enhanced Clarity',
    description: 'Improved instruction clarity and examples',
    created: '2024-02-01',
    status: 'stable',
    changes: [
      'Added more specific scoring rubrics',
      'Enhanced example responses',
      'Clearer improvement suggestions'
    ],
    prompts: {
      systemModifier: '\n\nProvide exceptionally clear and specific feedback.',
      scoringEmphasis: 'detailed',
      improvementCount: 5,
      responseStyle: 'constructive'
    }
  },

  v3: {
    id: 'v3',
    name: 'Industry-Focused',
    description: 'Enhanced industry-specific evaluation',
    created: '2024-03-01',
    status: 'experimental',
    changes: [
      'Added industry-specific criteria',
      'Weighted scoring by industry',
      'Role-level adjustments'
    ],
    prompts: {
      systemModifier: '\n\nPay special attention to industry-specific requirements and terminology.',
      scoringEmphasis: 'industry-weighted',
      improvementCount: 4,
      responseStyle: 'industry-aware'
    }
  },

  latest: {
    id: 'latest',
    name: 'Latest Stable',
    description: 'Alias for the latest stable version',
    aliasFor: 'v2'
  },

  experimental: {
    id: 'experimental',
    name: 'Experimental',
    description: 'Alias for the latest experimental version',
    aliasFor: 'v3'
  }
};

/**
 * Version selection strategies
 */
const SELECTION_STRATEGIES = {
  stable: () => 'latest',
  experimental: () => 'experimental',
  random: () => {
    const versions = ['v1', 'v2'];
    return versions[Math.floor(Math.random() * versions.length)];
  },
  config: () => getConfig('prompts.version', 'latest')
};

/**
 * Get prompt version
 * @param {string} versionId - Version identifier
 * @returns {Object} Version configuration
 */
const getVersion = curry(versionId => {
  const version = prop(versionId || 'latest', PROMPT_VERSIONS);

  if (!version) {
    logger.warn(`Unknown prompt version: ${versionId}, using latest`);
    return getVersion('latest');
  }

  // Resolve aliases
  if (version.aliasFor) {
    return getVersion(version.aliasFor);
  }

  return version;
});

/**
 * Apply version modifications to prompt
 * @param {string} versionId - Version to apply
 * @param {Object} basePrompt - Base prompt to modify
 * @returns {Object} Modified prompt
 */
const applyVersion = curry((versionId, basePrompt) => {
  const version = getVersion(versionId);
  const { prompts: versionMods } = version;

  if (!versionMods) {
    return basePrompt;
  }

  // Apply system prompt modifier
  const modifiedPrompt = evolve({
    system: system => system + (versionMods.systemModifier || ''),
    metadata: (metadata = {}) => merge(metadata, {
      version: version.id,
      versionName: version.name,
      scoringEmphasis: versionMods.scoringEmphasis
    })
  })(basePrompt);

  // Apply response style modifications
  if (versionMods.responseStyle === 'constructive') {
    modifiedPrompt.system += '\nAlways frame feedback constructively and encouragingly.';
  } else if (versionMods.responseStyle === 'industry-aware') {
    modifiedPrompt.system += '\nAlign feedback with industry best practices and expectations.';
  }

  return modifiedPrompt;
});

/**
 * Select version based on strategy
 * @param {string} strategy - Selection strategy
 * @returns {string} Selected version ID
 */
const selectVersion = curry((strategy = 'config') => {
  const selector = prop(strategy, SELECTION_STRATEGIES) || SELECTION_STRATEGIES.config;
  return selector();
});

/**
 * Track version performance
 * @param {string} versionId - Version ID
 * @param {Object} metrics - Performance metrics
 * @returns {void}
 */
const trackVersionPerformance = curry((versionId, metrics) => {
  logger.info('Prompt version performance', {
    version: versionId,
    ...metrics
  });

  // In production, send to analytics service
});

/**
 * Get version changelog
 * @param {string} fromVersion - Starting version
 * @param {string} toVersion - Target version
 * @returns {Array<Object>} Changelog entries
 */
const getChangelog = curry((fromVersion, toVersion) => {
  const versions = Object.values(PROMPT_VERSIONS)
    .filter(v => !v.aliasFor)
    .sort((a, b) => new Date(a.created) - new Date(b.created));

  const fromIndex = versions.findIndex(v => v.id === fromVersion);
  const toIndex = versions.findIndex(v => v.id === toVersion);

  if (fromIndex === -1 || toIndex === -1) {
    return [];
  }

  return versions.slice(fromIndex + 1, toIndex + 1).map(v => ({
    version: v.id,
    name: v.name,
    created: v.created,
    changes: v.changes
  }));
});

/**
 * Version comparison
 * @param {string} versionA - First version
 * @param {string} versionB - Second version
 * @returns {Object} Comparison result
 */
const compareVersions = curry((versionA, versionB) => {
  const a = getVersion(versionA);
  const b = getVersion(versionB);

  return {
    different: a.id !== b.id,
    aIsNewer: new Date(a.created) > new Date(b.created),
    changelog: getChangelog(b.id, a.id),
    stabilityChange: a.status !== b.status
  };
});

/**
 * Create versioned prompt generator
 * @param {Function} baseGenerator - Base prompt generator
 * @returns {Function} Versioned generator
 */
const createVersionedGenerator = curry(baseGenerator => curry((version, ...args) => {
  const basePrompt = baseGenerator(...args);
  return applyVersion(version, basePrompt);
}));

/**
 * Get all available versions
 * @returns {Array<Object>} Version list
 */
const getAllVersions = () => Object.values(PROMPT_VERSIONS)
  .filter(v => !v.aliasFor)
  .map(v => ({
    id: v.id,
    name: v.name,
    status: v.status,
    created: v.created
  }));

/**
 * Memoized version functions
 */
const memoizedGetVersion = memoize(getVersion);
const memoizedSelectVersion = memoize(selectVersion);

module.exports = {
  // Version registry
  PROMPT_VERSIONS,
  SELECTION_STRATEGIES,

  // Core functions
  getVersion: memoizedGetVersion,
  applyVersion,
  selectVersion: memoizedSelectVersion,

  // Tracking and comparison
  trackVersionPerformance,
  getChangelog,
  compareVersions,

  // Utilities
  createVersionedGenerator,
  getAllVersions,

  // Constants
  LATEST_STABLE: 'v2',
  LATEST_EXPERIMENTAL: 'v3'
};
