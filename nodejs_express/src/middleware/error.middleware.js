const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  const response = {
    error: statusCode === 500 ? 'Internal Server Error' : err.message
  };

  // Only show stack trace in development
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ error: "Route not found" });
};

module.exports = { errorHandler, notFoundHandler };