const { Certificate, Institution, VerificationLog } = require('../models');
const { verifyCertificateRecord, maskStudentName } = require('../services/verificationService');
const { generateCertificatePdf } = require('../services/pdfService');

/**
 * Public Verification Endpoint
 * @route POST /api/verification/verify
 */
exports.verifyCertificate = async (req, res, next) => {
  try {
    const { certificateId, source = 'web_manual' } = req.body;

    const metadata = {
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
      referrer: req.headers['referer'] || '',
    };

    const result = await verifyCertificateRecord(certificateId, source, metadata);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Public Certificate Record by Certificate ID
 * @route GET /api/certificates/:certificateId
 */
exports.getCertificateById = async (req, res, next) => {
  try {
    const rawId = req.params.certificateId;
    const cert = await Certificate.findOne({
      certificateId: rawId.toUpperCase().trim(),
    }).populate('institutionId', 'institutionName institutionType website logoUrl approvalStatus');

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found in registry.',
      });
    }

    // Public sanitized payload
    res.status(200).json({
      success: true,
      certificate: {
        certificateId: cert.certificateId,
        certificateTitle: cert.certificateTitle,
        studentName: cert.studentName,
        studentNameMasked: maskStudentName(cert.studentName),
        studentId: cert.studentId,
        institutionName: cert.institutionId?.institutionName || 'Unknown Institution',
        institutionType: cert.institutionId?.institutionType || '',
        institutionWebsite: cert.institutionId?.website || '',
        courseName: cert.courseName,
        grade: cert.grade || null,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        status: cert.status,
        revocationReason: cert.status === 'revoked' ? cert.revocationReason : null,
        qrCodeDataUri: cert.qrCodeDataUri,
        createdAt: cert.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download High-Resolution Certificate PDF
 * @route GET /api/certificates/:certificateId/pdf
 */
exports.downloadCertificatePdf = async (req, res, next) => {
  try {
    const cert = await Certificate.findOne({
      certificateId: req.params.certificateId.toUpperCase().trim(),
    }).populate('institutionId');

    if (!cert) {
      return res.status(404).json({
        success: false,
        message: 'Certificate record not found.',
      });
    }

    const host = `${req.protocol}://${req.get('host')}`;
    const doc = await generateCertificatePdf(cert, host);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CertiTrust-${cert.certificateId}.pdf"`
    );

    doc.pipe(res);
    doc.end();
  } catch (error) {
    next(error);
  }
};

/**
 * Public Certificate Directory with Pagination, Search and Filters
 * @route GET /api/certificates
 */
exports.getPublicDirectory = async (req, res, next) => {
  try {
    const {
      search = '',
      institution = '',
      status = '',
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status && ['valid', 'revoked', 'expired'].includes(status.toLowerCase())) {
      filter.status = status.toLowerCase();
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { certificateId: searchRegex },
        { courseName: searchRegex },
        { certificateTitle: searchRegex },
        { studentName: searchRegex },
      ];
    }

    let institutionFilter = null;
    if (institution) {
      const matchedInsts = await Institution.find({
        institutionName: new RegExp(institution.trim(), 'i'),
      }).select('_id');
      filter.institutionId = { $in: matchedInsts.map((i) => i._id) };
    }

    const total = await Certificate.countDocuments(filter);
    const certificates = await Certificate.find(filter)
      .populate('institutionId', 'institutionName institutionType')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Map public safe data
    const sanitized = certificates.map((cert) => ({
      certificateId: cert.certificateId,
      certificateTitle: cert.certificateTitle,
      studentNameMasked: maskStudentName(cert.studentName),
      courseName: cert.courseName,
      institutionName: cert.institutionId?.institutionName || 'Recognized Institution',
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      status: cert.status,
    }));

    res.status(200).json({
      success: true,
      count: sanitized.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      certificates: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recent Verification Attempts for Showcase
 * @route GET /api/verification/recent
 */
exports.getRecentVerifications = async (req, res, next) => {
  try {
    const logs = await VerificationLog.find()
      .populate('institutionId', 'institutionName')
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();

    const formatted = logs.map((log) => ({
      certificateId: log.certificateId,
      result: log.result,
      source: log.source,
      institutionName: log.institutionId?.institutionName || 'Accredited Issuer',
      timestamp: log.timestamp,
    }));

    res.status(200).json({
      success: true,
      logs: formatted,
    });
  } catch (error) {
    next(error);
  }
};
