/**
 * Error helper and global handler. Controllers use next(createError(400, 'message')). Response is JSON with error and message.
 */

function createError(statusCode, message) {
  const err = new Error(message || 'An error occurred');
  err.statusCode = statusCode;
  return err;
}

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

function notFoundHandler(req, res, next) {
  next(createError(404, `Cannot ${req.method} ${req.originalUrl || req.path}`));
}

module.exports = {
  createError,
  globalErrorHandler,
  notFoundHandler,
};
