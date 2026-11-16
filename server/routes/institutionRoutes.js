const express = require('express');
const router = express.Router();
const {
  getDashboard,
  issueCertificate,
  getCertificates,
  getCertificateById,
  requestRevocation,
  getVerificationHistory,
  updateProfile,
} = require('../controllers/institutionController');
const { protect, authorize, requireApprovedInstitution } = require('../middleware/auth');

// All institution routes require authentication and institution role
router.use(protect);
router.use(authorize('institution', 'admin'));

router.get('/dashboard', getDashboard);
router.get('/certificates', getCertificates);
router.get('/certificates/:id', getCertificateById);
router.post('/certificates/:id/revoke-request', requestRevocation);
router.get('/verification-history', getVerificationHistory);
router.put('/profile', updateProfile);

// Issuance specifically requires an APPROVED institution
router.post('/certificates', requireApprovedInstitution, issueCertificate);

module.exports = router;
