const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { mergeDeepRight } = require('ramda');
const { ConfigurationError } = require('./errors');

// Cache for loaded configuration
// eslint-disable-next-line fp/no-let
let configCache = null;

const loadYamlFile = filePath => {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw new ConfigurationError(`Failed to load config file ${filePath}: ${error.message}`);
  }
};

const loadConfiguration = () => {
  if (configCache) {
    return configCache;
  }

  const env = process.env.NODE_ENV || 'development';

  // Check if custom config file is specified via environment variable
  const customConfigPath = process.env.CONFIG_FILE_PATH;

  if (customConfigPath) {
    // Load configuration from custom path
    const absolutePath = path.isAbsolute(customConfigPath)
      ? customConfigPath
      : path.resolve(process.cwd(), customConfigPath);

    if (!fs.existsSync(absolutePath)) {
      throw new ConfigurationError(`Custom config file not found: ${absolutePath}`);
    }

    // eslint-disable-next-line fp/no-mutation
    configCache = loadYamlFile(absolutePath);
  } else {
    // Load configuration from config folder
    const configDir = path.join(__dirname, '../../config');
    const defaultConfig = loadYamlFile(path.join(configDir, 'default.yaml'));
    const envConfig = loadYamlFile(path.join(configDir, `${env}.yaml`));

    // Merge configurations (env config overrides default)
    // eslint-disable-next-line fp/no-mutation
    configCache = mergeDeepRight(defaultConfig, envConfig);
  }

  return configCache;
};

const getConfig = (configPath, defaultValue = undefined) => {
  const config = loadConfiguration();

  try {
    // Navigate through the config object using dot notation
    const keys = configPath.split('.');
    const finalValue = keys.reduce((value, key) => {
      if (value && typeof value === 'object' && key in value) {
        return value[key];
      }
      if (defaultValue !== undefined) {
        throw new Error('useDefault');
      }
      throw new ConfigurationError(`Configuration not found: ${configPath}`);
    }, config);

    return finalValue;
  } catch (error) {
    if (error.message === 'useDefault' || defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
};

const hasConfig = configPath => {
  try {
    getConfig(configPath);
    return true;
  } catch (error) {
    return false;
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

  const missingConfigs = requiredConfigs.filter(configPath => !hasConfig(configPath));

  if (missingConfigs.length > 0) {
    throw new ConfigurationError(
      `Missing required configurations: ${missingConfigs.join(', ')}`
    );
  }

  // Validate specific config values
  const port = getConfig('server.port');
  if (typeof port !== 'number' || port < 1 || port > 65535) {
    throw new ConfigurationError('server.port must be a valid port number (1-65535)');
  }

  const threshold = getConfig('evaluation.threshold');
  if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
    throw new ConfigurationError('evaluation.threshold must be between 0 and 1');
  }

  return true;
};

const getEnvironment = () => process.env.NODE_ENV || 'development';

const isDevelopment = () => getEnvironment() === 'development';

const isProduction = () => getEnvironment() === 'production';

const isTest = () => getEnvironment() === 'test';

// Clear cache when environment changes (useful for testing)
const clearConfigCache = () => {
  // eslint-disable-next-line fp/no-mutation
  configCache = null;
};

module.exports = {
  getConfig,
  hasConfig,
  validateConfig,
  getEnvironment,
  isDevelopment,
  isProduction,
  isTest,
  clearConfigCache
};
