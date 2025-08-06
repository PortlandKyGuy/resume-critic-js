const { createHealthRoutes } = require('./health.routes');
const { createV1Routes } = require('./v1');
const { createV2Routes } = require('./v2');

const applyRoutes = (app, routes) => {
  routes.forEach(route => {
    app.use(route.path, route.router);
  });
  return app;
};

const createRoutes = () => [
  { path: '/', router: createHealthRoutes() },
  { path: '/', router: createV1Routes() },  // Mount v1 routes at root to match OpenAPI
  { path: '/v2', router: createV2Routes() }
];

const registerRoutes = app => {
  const routes = createRoutes();
  return applyRoutes(app, routes);
};

module.exports = { registerRoutes, createRoutes };
