const { User, Institution, Certificate, VerificationLog, AuditLog } = require('../models');
const logAudit = require('../utils/auditLogger');

/**
 * Admin Dashboard Overview Metrics
 * @route GET /api/admin/dashboard
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalInstitutions,
      pendingInstitutions,
      approvedInstitutions,
      totalCertificates,
      activeCertificates,
      revokedCertificates,
      totalVerifications,
      suspiciousCount,
    ] = await Promise.all([
      Institution.countDocuments(),
      Institution.countDocuments({ approvalStatus: 'pending' }),
      Institution.countDocuments({ approvalStatus: 'approved' }),
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'valid' }),
      Certificate.countDocuments({ status: 'revoked' }),
      VerificationLog.countDocuments(),
      VerificationLog.countDocuments({ result: { $in: ['CONFLICT', 'INVALID'] } }),
    ]);

    // Monthly platform registration trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyCertificates = await Certificate.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthlyCerts = monthlyCertificates.map((m) => ({
      label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      count: m.count,
    }));

    // Recent 5 pending institutions
    const pendingList = await Institution.find({ approvalStatus: 'pending' })
      .populate('ownerUserId', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent 6 audit logs
    const recentAudits = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      metrics: {
        totalInstitutions,
        pendingInstitutions,
        approvedInstitutions,
        totalCertificates,
        activeCertificates,
        revokedCertificates,
        totalVerifications,
        suspiciousCount,
      },
      trends: {
        monthlyCertificates: formattedMonthlyCerts,
      },
      pendingList,
      recentAudits,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List All Institutions
 * @route GET /api/admin/institutions
 */
exports.getInstitutions = async (req, res, next) => {
  try {
    const { status = '', search = '', page = 1, limit = 15 } = req.query;

    const query = {};
    if (status && ['pending', 'approved', 'rejected', 'suspended'].includes(status.toLowerCase())) {
      query.approvalStatus = status.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { institutionName: searchRegex },
        { officialEmail: searchRegex },
        { institutionType: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await Institution.countDocuments(query);
    const institutions = await Institution.find(query)
      .populate('ownerUserId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      institutions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve Institution Application
 * @route PATCH /api/admin/institutions/:id/approve
 */
exports.approveInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    institution.approvalStatus = 'approved';
    institution.approvedAt = new Date();
    institution.approvedBy = req.user._id;
    institution.rejectionReason = '';
    await institution.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'INSTITUTION_APPROVED',
      entityType: 'Institution',
      entityId: institution._id,
      details: { institutionName: institution.institutionName },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Institution "${institution.institutionName}" has been successfully approved.`,
      institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject Institution Application
 * @route PATCH /api/admin/institutions/:id/reject
 */
exports.rejectInstitution = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    institution.approvalStatus = 'rejected';
    institution.rejectionReason = reason || 'Failed institutional verification compliance.';
    await institution.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'INSTITUTION_REJECTED',
      entityType: 'Institution',
      entityId: institution._id,
      details: { institutionName: institution.institutionName, reason },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Institution "${institution.institutionName}" has been rejected.`,
      institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend Institution
 * @route PATCH /api/admin/institutions/:id/suspend
 */
exports.suspendInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }

    institution.approvalStatus = 'suspended';
    await institution.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'INSTITUTION_SUSPENDED',
      entityType: 'Institution',
      entityId: institution._id,
      details: { institutionName: institution.institutionName },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Institution "${institution.institutionName}" has been suspended.`,
      institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View All Certificates Across Platform
 * @route GET /api/admin/certificates
 */
exports.getAllCertificates = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 15 } = req.query;

    const query = {};
    if (status && ['valid', 'revoked', 'expired', 'pending'].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { certificateId: searchRegex },
        { studentName: searchRegex },
        { studentEmail: searchRegex },
        { courseName: searchRegex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await Certificate.countDocuments(query);
    const certificates = await Certificate.find(query)
      .populate('institutionId', 'institutionName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      certificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Revoke Certificate
 * @route PATCH /api/admin/certificates/:id/revoke
 */
exports.revokeCertificate = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cert = await Certificate.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    cert.status = 'revoked';
    cert.revokedAt = new Date();
    cert.revocationReason = reason || 'Administratively revoked for compliance violation.';
    await cert.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CERTIFICATE_REVOKED_BY_ADMIN',
      entityType: 'Certificate',
      entityId: cert._id,
      details: { certificateId: cert.certificateId, reason },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Certificate ${cert.certificateId} has been revoked.`,
      certificate: cert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View Verification Logs
 * @route GET /api/admin/verification-logs
 */
exports.getVerificationLogs = async (req, res, next) => {
  try {
    const { result = '', page = 1, limit = 20 } = req.query;

    const query = {};
    if (result) {
      query.result = result.toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await VerificationLog.countDocuments(query);
    const logs = await VerificationLog.find(query)
      .populate('institutionId', 'institutionName')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspicious Activity Review
 * Flags CONFLICT results, rapid invalid bursts, and high-frequency checks
 * @route GET /api/admin/suspicious-activity
 */
exports.getSuspiciousActivity = async (req, res, next) => {
  try {
    // 1. Conflicts (Duplicate attempt collision)
    const conflicts = await VerificationLog.find({ result: 'CONFLICT' })
      .sort({ timestamp: -1 })
      .limit(20);

    // 2. High-failure IPs
    const suspiciousIps = await VerificationLog.aggregate([
      { $match: { result: { $in: ['INVALID', 'NOT_FOUND', 'CONFLICT'] } } },
      {
        $group: {
          _id: '$requestMetadata.ipAddress',
          failedCount: { $sum: 1 },
          lastAttempt: { $max: '$timestamp' },
        },
      },
      { $match: { failedCount: { $gte: 3 } } },
      { $sort: { failedCount: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      conflicts,
      suspiciousIps,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * View Platform Audit Logs
 * @route GET /api/admin/audit-logs
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 25 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate('userId', 'fullName email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
