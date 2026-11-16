const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  verifyCertificate,
  getRecentVerifications,
} = require('../controllers/verificationController');

// Verification rate limiting to prevent automated scraping
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 verifications per minute per IP
  message: {
    success: false,
    message: 'Verification request limit exceeded. Please wait a moment and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/verify', verifyLimiter, verifyCertificate);
router.get('/recent', getRecentVerifications);

module.exports = router;
