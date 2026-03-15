/**
 * HTTP error helper and global error middleware.
 * Controllers can call next(createError(400, 'message')) to return 400/404/409 etc.
 */

function createError(statusCode, message) {
  const err = new Error(message || 'An error occurred');
  err.statusCode = statusCode;
  return err;
}

/**
 * Global error handler. Must be registered after all routes.
 * Sends consistent JSON: { error: <status label>, message: <string> }
 * Uses err.statusCode or 500. Does not leak stack traces to the client.
 */
function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  const statusLabel =
    statusCode === 400
      ? 'Bad Request'
      : statusCode === 401
        ? 'Unauthorized'
        : statusCode === 404
          ? 'Not Found'
          : statusCode === 409
            ? 'Conflict'
            : statusCode === 201
              ? 'Created'
              : statusCode === 502
                ? 'Bad Gateway'
                : statusCode === 503
                  ? 'Service Unavailable'
                  : statusCode >= 500
                    ? 'Internal Server Error'
                    : 'Error';

  res.status(statusCode).json({
    error: statusLabel,
    message,
  });
}

/**
 * 404 for unmatched routes. Sends JSON and forwards to error handler.
 */
function notFoundHandler(req, res, next) {
  next(createError(404, `Cannot ${req.method} ${req.originalUrl || req.path}`));
}

module.exports = {
  createError,
  globalErrorHandler,
  notFoundHandler,
};
