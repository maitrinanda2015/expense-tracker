class AppError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code || defaultCode(status);
    if (details) this.details = details;
  }
}

function defaultCode(status) {
  return (
    {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      413: 'PAYLOAD_TOO_LARGE',
      429: 'RATE_LIMITED',
    }[status] || 'ERROR'
  );
}

const notFound = (what = 'Resource') => new AppError(404, `${what} not found`);

module.exports = { AppError, notFound };
