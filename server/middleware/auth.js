const jwt = require('jsonwebtoken');
const { User, Institution } = require('../models');

/**
 * Protect routes - Verifies JWT from cookie or Authorization header
 */
const protect = async (req, res, next) => {
  let token = null;

  // 1. Check cookies first
  if (req.cookies && req.cookies.certitrust_token) {
    token = req.cookies.certitrust_token;
  }
  // 2. Check Authorization Bearer header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please log in to proceed.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'certitrust_super_secret_jwt_key_2026'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user session is no longer valid.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session has expired or is invalid. Please log in again.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires ${roles.join(' or ')} privileges.`,
      });
    }
    next();
  };
};

/**
 * Requires the institution to have approvalStatus === 'approved'
 */
const requireApprovedInstitution = async (req, res, next) => {
  try {
    const institution = await Institution.findOne({ ownerUserId: req.user._id });

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'No institution profile found for this account.',
      });
    }

    if (institution.approvalStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        institutionStatus: institution.approvalStatus,
        message: `Institution account status is "${institution.approvalStatus}". Only verified, administrator-approved institutions can issue digital credentials.`,
      });
    }

    req.institution = institution;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to verify institution authorization status.',
    });
  }
};

/**
 * Optional Auth - populates req.user if token is present, does not reject if absent
 */
const optionalAuth = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.certitrust_token) {
    token = req.cookies.certitrust_token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) return next();

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'certitrust_super_secret_jwt_key_2026'
    );
    const user = await User.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (e) {
    // Ignore invalid token in optional auth
  }

  next();
};

module.exports = {
  protect,
  authorize,
  requireApprovedInstitution,
  optionalAuth,
};
