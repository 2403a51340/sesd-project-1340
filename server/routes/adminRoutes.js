const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getInstitutions,
  approveInstitution,
  rejectInstitution,
  suspendInstitution,
  getAllCertificates,
  revokeCertificate,
  getVerificationLogs,
  getSuspiciousActivity,
  getAuditLogs,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes strictly require authentication and 'admin' role
router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/institutions', getInstitutions);
router.patch('/institutions/:id/approve', approveInstitution);
router.patch('/institutions/:id/reject', rejectInstitution);
router.patch('/institutions/:id/suspend', suspendInstitution);

router.get('/certificates', getAllCertificates);
router.patch('/certificates/:id/revoke', revokeCertificate);

router.get('/verification-logs', getVerificationLogs);
router.get('/suspicious-activity', getSuspiciousActivity);
router.get('/audit-logs', getAuditLogs);

module.exports = router;
