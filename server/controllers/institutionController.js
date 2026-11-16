const { Certificate, Institution, VerificationLog } = require('../models');
const generateCertificateId = require('../utils/generateCertificateId');
const { generateVerificationQr } = require('../services/qrService');
const logAudit = require('../utils/auditLogger');

/**
 * Get Institution Dashboard Metrics and Charts Data
 * @route GET /api/institution/dashboard
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const institution = await Institution.findOne({ ownerUserId: req.user._id });
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution profile not found.' });
    }

    const instId = institution._id;

    // Aggregations from real MongoDB collections
    const [totalIssued, activeCerts, revokedCerts, expiredCerts] = await Promise.all([
      Certificate.countDocuments({ institutionId: instId }),
      Certificate.countDocuments({ institutionId: instId, status: 'valid' }),
      Certificate.countDocuments({ institutionId: instId, status: 'revoked' }),
      Certificate.countDocuments({ institutionId: instId, status: 'expired' }),
    ]);

    // Verification attempts for this institution's certificates
    const verificationAttempts = await VerificationLog.countDocuments({ institutionId: instId });

    // Monthly Issuance Trends (past 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthlyAggregation = await Certificate.aggregate([
      {
        $match: {
          institutionId: instId,
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyIssuance = monthlyAggregation.map((item) => ({
      label: `${monthNames[item._id.month - 1]} ${item._id.year}`,
      count: item.count,
    }));

    // Course distribution
    const courseAggregation = await Certificate.aggregate([
      { $match: { institutionId: instId } },
      { $group: { _id: '$courseName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const courseDistribution = courseAggregation.map((c) => ({
      course: c._id,
      count: c.count,
    }));

    // Recent 5 issued certificates
    const recentCertificates = await Certificate.find({ institutionId: instId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      institution: {
        id: institution._id,
        name: institution.institutionName,
        type: institution.institutionType,
        approvalStatus: institution.approvalStatus,
        officialEmail: institution.officialEmail,
      },
      metrics: {
        totalIssued,
        activeCerts,
        revokedCerts,
        expiredCerts,
        verificationAttempts,
      },
      charts: {
        monthlyIssuance,
        statusDistribution: {
          valid: activeCerts,
          revoked: revokedCerts,
          expired: expiredCerts,
        },
        courseDistribution,
      },
      recentCertificates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Issue a New Certificate
 * @route POST /api/institution/certificates
 */
exports.issueCertificate = async (req, res, next) => {
  try {
    const institution = req.institution; // Provided by requireApprovedInstitution middleware

    const {
      studentName,
      studentId,
      studentEmail,
      courseName,
      certificateTitle,
      grade,
      issueDate,
      expiryDate,
      additionalInfo,
    } = req.body;

    if (!studentName || !studentId || !studentEmail || !courseName) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields (Student Name, ID, Email, Course).',
      });
    }

    // Generate unique Certificate ID (e.g. CT2026000001)
    const certificateId = await generateCertificateId();

    // Generate QR Code data URI containing verification URL
    const host = `${req.protocol}://${req.get('host')}`;
    const { qrDataUri } = await generateVerificationQr(certificateId, host);

    const certificate = await Certificate.create({
      certificateId,
      studentName: studentName.trim(),
      studentId: studentId.trim(),
      studentEmail: studentEmail.toLowerCase().trim(),
      institutionId: institution._id,
      courseName: courseName.trim(),
      certificateTitle: certificateTitle ? certificateTitle.trim() : 'Certificate of Completion',
      grade: grade ? grade.trim() : '',
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      status: 'valid',
      issuedBy: req.user._id,
      additionalInfo: additionalInfo ? additionalInfo.trim() : '',
      qrCodeDataUri: qrDataUri,
    });

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CERTIFICATE_ISSUED',
      entityType: 'Certificate',
      entityId: certificate._id,
      details: {
        certificateId,
        studentName,
        courseName,
        institutionName: institution.institutionName,
      },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Certificate successfully registered and issued!',
      certificate,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Issued Certificates with Search, Filter & Pagination
 * @route GET /api/institution/certificates
 */
exports.getCertificates = async (req, res, next) => {
  try {
    const institution = await Institution.findOne({ ownerUserId: req.user._id });
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution profile not found.' });
    }

    const {
      search = '',
      status = '',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = { institutionId: institution._id };

    if (status && ['valid', 'revoked', 'expired', 'pending'].includes(status.toLowerCase())) {
      query.status = status.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { certificateId: searchRegex },
        { studentName: searchRegex },
        { studentId: searchRegex },
        { studentEmail: searchRegex },
        { courseName: searchRegex },
      ];
    }

    const total = await Certificate.countDocuments(query);
    const certificates = await Certificate.find(query)
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
 * Get Single Certificate Details
 * @route GET /api/institution/certificates/:id
 */
exports.getCertificateById = async (req, res, next) => {
  try {
    const cert = await Certificate.findById(req.params.id).populate('institutionId');
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    // Verify ownership
    const institution = await Institution.findOne({ ownerUserId: req.user._id });
    if (
      req.user.role !== 'admin' &&
      (!institution || cert.institutionId._id.toString() !== institution._id.toString())
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this certificate.' });
    }

    res.status(200).json({
      success: true,
      certificate: cert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request Certificate Revocation
 * @route POST /api/institution/certificates/:id/revoke-request
 */
exports.requestRevocation = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const cert = await Certificate.findById(req.params.id);
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const institution = await Institution.findOne({ ownerUserId: req.user._id });
    if (
      req.user.role !== 'admin' &&
      (!institution || cert.institutionId.toString() !== institution._id.toString())
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized action.' });
    }

    cert.revocationRequested = true;
    cert.revocationRequestReason = reason || 'Revocation requested by issuing institution.';
    // If institution immediately revokes directly
    cert.status = 'revoked';
    cert.revokedAt = new Date();
    cert.revocationReason = reason || 'Revoked upon request of the issuing institution.';
    await cert.save();

    await logAudit({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CERTIFICATE_REVOKED_BY_INSTITUTION',
      entityType: 'Certificate',
      entityId: cert._id,
      details: { certificateId: cert.certificateId, reason },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Certificate has been revoked successfully.',
      certificate: cert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Institution Verification History
 * @route GET /api/institution/verification-history
 */
exports.getVerificationHistory = async (req, res, next) => {
  try {
    const institution = await Institution.findOne({ ownerUserId: req.user._id });
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution profile not found.' });
    }

    const logs = await VerificationLog.find({ institutionId: institution._id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Institution Profile
 * @route PUT /api/institution/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { phone, website, address } = req.body;
    const institution = await Institution.findOne({ ownerUserId: req.user._id });
    if (!institution) {
      return res.status(404).json({ success: false, message: 'Institution profile not found.' });
    }

    if (phone) institution.phone = phone.trim();
    if (website !== undefined) institution.website = website.trim();
    if (address) institution.address = address.trim();

    await institution.save();

    res.status(200).json({
      success: true,
      message: 'Institution profile updated successfully.',
      institution,
    });
  } catch (error) {
    next(error);
  }
};
