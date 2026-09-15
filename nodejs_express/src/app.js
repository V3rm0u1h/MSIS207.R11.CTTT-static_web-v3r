require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const helloRoutes = require('./routes/hello.routes');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

const app = express();

// Security Middleware
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/v1', helloRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;