const winston = require('winston');
const { getConfig } = require('./config');

const createLogger = (options = {}) => {
  const logLevel = options.level || process.env.LOG_LEVEL || getConfig('logging.level', 'info');
  const nodeEnv = process.env.NODE_ENV || 'development';

  const formats = [
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat()
  ];

  if (nodeEnv === 'development') {
    formats.push(winston.format.colorize());
    formats.push(winston.format.simple());
  } else {
    formats.push(winston.format.json());
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(...formats),
    transports: [
      new winston.transports.Console({
        stderrLevels: ['error']
      })
    ]
  });

  if (nodeEnv === 'production' && options.file) {
    logger.add(new winston.transports.File({
      filename: options.file.error || 'error.log',
      level: 'error'
    }));

    logger.add(new winston.transports.File({
      filename: options.file.combined || 'combined.log'
    }));
  }

  return logger;
};

const defaultLogger = createLogger();

module.exports = {
  createLogger,
  logger: defaultLogger
};
