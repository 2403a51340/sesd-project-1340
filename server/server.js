require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`
=====================================================
  CERTITRUST PLATFORM BACKEND ENGINE READY
  Port:        ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  URL:         http://localhost:${PORT}
  API Base:    http://localhost:${PORT}/api
=====================================================
    `);
  });

  // Handle Unhandled Promise Rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection Error]: ${err.message}`);
  });

  // Handle Uncaught Exceptions
  process.on('uncaughtException', (err) => {
    console.error(`[Uncaught Exception]: ${err.message}`);
    process.exit(1);
  });
});
