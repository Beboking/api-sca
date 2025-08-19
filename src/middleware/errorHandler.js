const logger = require('../utils/logger');
const { ValidationError } = require('../utils/validation');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      field: err.field
    });
  }

  if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body'
    });
  }

  if (err.code === 'ENOENT') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Required file not found'
    });
  }

  if (err.code === 'EACCES') {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'File access denied'
    });
  }

  if (err.code === 'ETIMEDOUT') {
    return res.status(408).json({
      error: 'Request Timeout',
      message: 'Request took too long to process'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Error',
    message: message
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
