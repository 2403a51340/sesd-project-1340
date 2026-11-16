const { Certificate, VerificationLog } = require('../models');

/**
 * Normalizes input certificate IDs
 * Trims spaces, uppercase, removes accidental trailing hashes/queries
 */
const normalizeCertificateId = (rawId) => {
  if (!rawId || typeof rawId !== 'string') return '';
  return rawId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
};

/**
 * Validates the syntax of a Certificate ID
 */
const isValidFormat = (id) => {
  // Accepts standard CertiTrust format (e.g. CT2026000001) or standard alphanumeric IDs 6-25 chars
  return /^CT[0-9]{4}[0-9A-Z]{4,10}$/i.test(id) || /^[A-Z0-9_-]{6,25}$/i.test(id);
};

/**
 * Masks student name slightly for public verification privacy (e.g., "John Doe" -> "John D***")
 * or preserves first name and last initial
 */
const maskStudentName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].length > 2
      ? `${parts[0].slice(0, 2)}***`
      : parts[0];
  }
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
};

/**
 * Core Verification Logic
 * @param {string} rawCertificateId 
 * @param {string} source - 'web_manual', 'qr_scan', or 'api'
 * @param {Object} metadata - ipAddress, userAgent, referrer
 * @returns {Promise<Object>} Verification evaluation result
 */
const verifyCertificateRecord = async (rawCertificateId, source = 'web_manual', metadata = {}) => {
  const certificateId = normalizeCertificateId(rawCertificateId);

  const logAttempt = async (resultCode, institutionId = null) => {
    try {
      await VerificationLog.create({
        certificateId: certificateId || 'UNKNOWN',
        result: resultCode,
        institutionId,
        source,
        requestMetadata: {
          ipAddress: metadata.ipAddress || '127.0.0.1',
          userAgent: metadata.userAgent || '',
          referrer: metadata.referrer || '',
        },
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[Verification Log Error]:', err.message);
    }
  };

  // 1. Format validation
  if (!certificateId || !isValidFormat(certificateId)) {
    await logAttempt('INVALID');
    return {
      isValid: false,
      status: 'INVALID',
      title: 'Invalid Certificate Format',
      message: 'The provided Certificate ID is malformed or invalid.',
      certificateId: rawCertificateId || '',
      verifiedAt: new Date().toISOString(),
      details: null,
    };
  }

  // 2. Search MongoDB for all matching records to detect conflicts/duplicates
  const matches = await Certificate.find({ certificateId })
    .populate('institutionId', 'institutionName institutionType website approvalStatus')
    .exec();

  // 3. Duplicate conflict check
  if (matches.length > 1) {
    await logAttempt('CONFLICT');
    return {
      isValid: false,
      status: 'CONFLICT',
      title: 'Conflicting Records Detected',
      message: 'Multiple conflicting records were found with this Certificate ID. This event has been flagged for administrative security review.',
      certificateId,
      verifiedAt: new Date().toISOString(),
      details: null,
    };
  }

  // 4. Record not found
  if (matches.length === 0) {
    await logAttempt('NOT_FOUND');
    return {
      isValid: false,
      status: 'NOT_FOUND',
      title: 'Certificate Not Found',
      message: 'No certificate record exists matching this ID in the CertiTrust verified registry.',
      certificateId,
      verifiedAt: new Date().toISOString(),
      details: null,
    };
  }

  const cert = matches[0];
  const institution = cert.institutionId;

  // 5. Revocation check
  if (cert.status === 'revoked') {
    await logAttempt('REVOKED', institution?._id);
    return {
      isValid: false,
      status: 'REVOKED',
      title: 'Certificate Revoked',
      message: 'This certificate was formally revoked by the issuing authority.',
      certificateId,
      verifiedAt: new Date().toISOString(),
      revocationDate: cert.revokedAt || cert.updatedAt,
      revocationReason: cert.revocationReason || 'Revoked by the issuing institution or compliance authority.',
      details: {
        certificateTitle: cert.certificateTitle,
        studentNameMasked: maskStudentName(cert.studentName),
        institutionName: institution ? institution.institutionName : 'Unknown Institution',
        courseName: cert.courseName,
        issueDate: cert.issueDate,
      },
    };
  }

  // 6. Expiry check
  const now = new Date();
  if (cert.expiryDate && new Date(cert.expiryDate) < now) {
    await logAttempt('EXPIRED', institution?._id);
    return {
      isValid: false,
      status: 'EXPIRED',
      title: 'Certificate Expired',
      message: `This certificate expired on ${new Date(cert.expiryDate).toLocaleDateString('en-US')}.`,
      certificateId,
      verifiedAt: new Date().toISOString(),
      details: {
        certificateTitle: cert.certificateTitle,
        studentNameMasked: maskStudentName(cert.studentName),
        institutionName: institution ? institution.institutionName : 'Unknown Institution',
        courseName: cert.courseName,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
      },
    };
  }

  // 7. Pending / Suspension check
  if (cert.status === 'pending' || (institution && institution.approvalStatus !== 'approved')) {
    await logAttempt('PENDING', institution?._id);
    return {
      isValid: false,
      status: 'PENDING',
      title: 'Certificate Pending Approval',
      message: 'This credential or its issuing institution is currently pending verification approval.',
      certificateId,
      verifiedAt: new Date().toISOString(),
      details: null,
    };
  }

  // 8. Active Approved Valid Certificate
  if (cert.status === 'valid') {
    await logAttempt('VALID', institution?._id);
    return {
      isValid: true,
      status: 'VALID',
      title: 'Certificate Verified Successfully',
      message: 'This digital credential is authentic, active, and cryptographically registered.',
      certificateId,
      verifiedAt: new Date().toISOString(),
      details: {
        certificateId: cert.certificateId,
        certificateTitle: cert.certificateTitle,
        studentName: cert.studentName,
        studentNameMasked: maskStudentName(cert.studentName),
        studentId: cert.studentId,
        institutionName: institution ? institution.institutionName : 'Accredited Institution',
        institutionType: institution ? institution.institutionType : '',
        courseName: cert.courseName,
        grade: cert.grade || null,
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate || null,
        status: 'VALID',
        additionalInfo: cert.additionalInfo || null,
      },
    };
  }

  // Fallback
  await logAttempt('INVALID', institution?._id);
  return {
    isValid: false,
    status: 'INVALID',
    title: 'Verification Inconclusive',
    message: 'The certificate record could not be authenticated.',
    certificateId,
    verifiedAt: new Date().toISOString(),
    details: null,
  };
};

module.exports = {
  normalizeCertificateId,
  isValidFormat,
  maskStudentName,
  verifyCertificateRecord,
};
