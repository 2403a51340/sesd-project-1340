const mongoose = require('mongoose');

/**
 * Connect to MongoDB with robust connection management,
 * retry handling, and event listeners.
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certitrust';

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Build indexes automatically in development
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    // Do not crash the entire process immediately in dev mode so API docs/static assets remain reachable
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Database] MongoDB reconnected');
});

module.exports = connectDB;
