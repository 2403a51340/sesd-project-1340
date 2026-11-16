const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Institution } = require('../models');
const logAudit = require('../utils/auditLogger');

/**
 * Generate JWT and set secure HTTP-only cookie
 */
const sendTokenResponse = (user, statusCode, res, extraData = {}) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'certitrust_super_secret_jwt_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res
    .status(statusCode)
    .cookie('certitrust_token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...extraData,
    });
};

/**
 * Register User or Institution
 * @route POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      role = 'student',
      // Institution specific fields
      institutionName,
      institutionType,
      phone,
      website,
      address,
    } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required account details.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address is already registered.',
      });
    }

    // Role cannot be registered as 'admin' directly through open public signup
    const assignedRole = role === 'institution' ? 'institution' : 'student';

    // Create User
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: assignedRole,
    });

    let institution = null;
    if (assignedRole === 'institution') {
      if (!institutionName || !phone || !address) {
        // Rollback user if institution details incomplete
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Please fill in all required institution details (name, phone, address).',
        });
      }

      institution = await Institution.create({
        institutionName: institutionName.trim(),
        institutionType: institutionType || 'University',
        officialEmail: email.toLowerCase().trim(),
        phone: phone.trim(),
        website: website ? website.trim() : '',
        address: address.trim(),
        approvalStatus: 'pending', // Requires admin approval
        ownerUserId: user._id,
      });

      await logAudit({
        userId: user._id,
        userEmail: user.email,
        action: 'INSTITUTION_REGISTERED',
        entityType: 'Institution',
        entityId: institution._id,
        details: { institutionName: institution.institutionName },
        req,
      });
    } else {
      await logAudit({
        userId: user._id,
        userEmail: user.email,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user._id,
        details: { role: assignedRole },
        req,
      });
    }

    sendTokenResponse(user, 201, res, {
      message:
        assignedRole === 'institution'
          ? 'Registration successful! Your institution application has been submitted and is pending administrator verification.'
          : 'Registration successful! Welcome to CertiTrust.',
      institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email and password.',
      });
    }

    // Query user and explicitly select passwordHash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email and password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact CertiTrust support.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Please check your email and password.',
      });
    }

    let institution = null;
    if (user.role === 'institution') {
      institution = await Institution.findOne({ ownerUserId: user._id });
    }

    await logAudit({
      userId: user._id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      details: { role: user.role },
      req,
    });

    sendTokenResponse(user, 200, res, {
      message: 'Login successful.',
      institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout User
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  res.cookie('certitrust_token', 'none', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully.',
  });
};

/**
 * Get Current Logged-in User Profile
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let institution = null;

    if (user.role === 'institution') {
      institution = await Institution.findOne({ ownerUserId: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      institution,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password Flow
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return 200 to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a password reset token has been generated.',
      });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    await logAudit({
      userId: user._id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user._id,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset token generated successfully. In development demo mode, use the token below.',
      resetToken, // Provided in development for demo testing
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide token and new password.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token.',
      });
    }

    user.passwordHash = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await logAudit({
      userId: user._id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user._id,
      req,
    });

    sendTokenResponse(user, 200, res, {
      message: 'Password has been reset successfully. You are now logged in.',
    });
  } catch (error) {
    next(error);
  }
};
