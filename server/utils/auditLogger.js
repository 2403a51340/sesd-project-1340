const { AuditLog } = require('../models');

/**
 * Log an administrative, security, or audit event into the database
 */
const logAudit = async ({
  userId = null,
  userEmail = 'system',
  action,
  entityType,
  entityId = '',
  details = {},
  req = null,
}) => {
  try {
    const ipAddress = req
      ? req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1'
      : '127.0.0.1';

    await AuditLog.create({
      userId,
      userEmail,
      action,
      entityType,
      entityId: String(entityId),
      details,
      ipAddress: String(ipAddress),
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('[Audit Logger Error]:', error.message);
  }
};

module.exports = logAudit;
