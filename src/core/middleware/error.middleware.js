const logger  = require('../utils/logger');
const { error } = require('../utils/response');

/**
 * Global error handler — catches unhandled errors from all routes
 */
const errorHandler = (err, _req, res, _next) => {
  logger.error(err.message, err.stack);

  const statusCode = err.statusCode || 500;
  const message    = err.message    || 'Internal Server Error';

  res.status(statusCode).json(error(message, statusCode));
};

module.exports = errorHandler;
