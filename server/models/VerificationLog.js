const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    result: {
      type: String,
      enum: ['VALID', 'INVALID', 'REVOKED', 'EXPIRED', 'CONFLICT', 'NOT_FOUND'],
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      default: null,
    },
    source: {
      type: String,
      enum: ['web_manual', 'qr_scan', 'api'],
      default: 'web_manual',
    },
    requestMetadata: {
      ipAddress: { type: String, default: '127.0.0.1' },
      userAgent: { type: String, default: '' },
      referrer: { type: String, default: '' },
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

verificationLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
