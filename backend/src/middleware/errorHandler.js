const logger = require('../utils/logger');
const { errorResponse } = require('../utils/helpers');

function errorHandler(err, req, res, next) {
  logger.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });
  if (res.headersSent) return next(err);
  return errorResponse(res, process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message, 500);
}

module.exports = errorHandler;
