const config = require('config');
const { ConfigurationError } = require('./errors');

const getConfig = (path, defaultValue = undefined) => {
  try {
    return config.has(path) ? config.get(path) : defaultValue;
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new ConfigurationError(`Configuration not found: ${path}`);
  }
};

const validateConfig = () => {
  const requiredConfigs = [
    'server.port',
    'server.bodyLimit',
    'llm.provider',
    'llm.retry.maxRetries',
    'critics.enabled',
    'evaluation.threshold',
    'prompts.industry',
    'audit.enabled',
    'logging.level'
  ];

  const missingConfigs = requiredConfigs.filter(path => !config.has(path));

  if (missingConfigs.length > 0) {
    throw new ConfigurationError(
      `Missing required configurations: ${missingConfigs.join(', ')}`
    );
  }

  // Validate specific config values
  const port = config.get('server.port');
  if (typeof port !== 'number' || port < 1 || port > 65535) {
    throw new ConfigurationError('server.port must be a valid port number (1-65535)');
  }

  const threshold = config.get('evaluation.threshold');
  if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
    throw new ConfigurationError('evaluation.threshold must be between 0 and 1');
  }

  return true;
};

const getEnvironment = () => process.env.NODE_ENV || 'development';

const isDevelopment = () => getEnvironment() === 'development';

const isProduction = () => getEnvironment() === 'production';

const isTest = () => getEnvironment() === 'test';

module.exports = {
  getConfig,
  validateConfig,
  getEnvironment,
  isDevelopment,
  isProduction,
  isTest
};
