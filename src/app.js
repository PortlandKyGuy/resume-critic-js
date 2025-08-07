const express = require('express');
const compression = require('compression');
const { pipe } = require('ramda');
const { logger } = require('./utils/logger');
const { getConfig, validateConfig } = require('./utils/config');
const { errorHandler, notFoundHandler } = require('./api/middleware/error.middleware');
const { registerRoutes } = require('./api/routes');

const createApp = () => {
  validateConfig();

  const app = express();

  const applyMiddleware = appInstance => {
    appInstance.use(compression());
    appInstance.use(express.json({ limit: getConfig('server.bodyLimit', '2mb') }));
    appInstance.use(express.urlencoded({ extended: true, limit: getConfig('server.bodyLimit', '2mb') }));

    appInstance.use((req, res, next) => {
      logger.info({
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });

    return appInstance;
  };

  const applyRoutes = appInstance => registerRoutes(appInstance);

  const applyErrorHandlers = appInstance => {
    appInstance.use(notFoundHandler);
    appInstance.use(errorHandler);
    return appInstance;
  };

  const configuredApp = pipe(
    applyMiddleware,
    applyRoutes,
    applyErrorHandlers
  )(app);

  return configuredApp;
};

// eslint-disable-next-line consistent-return
const start = async () => {
  // eslint-disable-next-line fp/no-let
  let server;
  try {
    const app = createApp();
    const port = getConfig('server.port', 8000);

    // eslint-disable-next-line fp/no-mutation
    server = app.listen(port, () => {
      logger.info(`Server started on port ${port} in ${process.env.NODE_ENV || 'ENV_NOT_SET'} mode`);
    });

    const gracefulShutdown = () => {
      logger.info('Received shutdown signal, gracefully shutting down...');

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

module.exports = { createApp, start };

if (require.main === module) {
  start();
}
