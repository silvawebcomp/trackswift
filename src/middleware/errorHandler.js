function errorHandler(error, _req, res, _next) {
  if (error.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'A record with that value already exists.' });
  }

  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) console.error(error);
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal server error.' : error.message
  });
}

module.exports = errorHandler;
