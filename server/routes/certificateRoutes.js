const express = require('express');
const router = express.Router();
const {
  getCertificateById,
  downloadCertificatePdf,
  getPublicDirectory,
} = require('../controllers/verificationController');

// Public certificate directory
router.get('/', getPublicDirectory);

// Public certificate record by ID
router.get('/:certificateId', getCertificateById);

// Public certificate PDF download
router.get('/:certificateId/pdf', downloadCertificatePdf);

module.exports = router;
