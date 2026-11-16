const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: [true, 'Certificate ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: [100, 'Student name cannot exceed 100 characters'],
    },
    studentId: {
      type: String,
      required: [true, 'Student ID or Roll No is required'],
      trim: true,
    },
    studentEmail: {
      type: String,
      required: [true, 'Student email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid student email',
      ],
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: [true, 'Issuing institution reference is required'],
      index: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course or Program name is required'],
      trim: true,
    },
    certificateTitle: {
      type: String,
      required: [true, 'Certificate title is required'],
      trim: true,
      default: 'Certificate of Completion',
    },
    grade: {
      type: String,
      trim: true,
      default: '',
    },
    issueDate: {
      type: Date,
      required: [true, 'Issue date is required'],
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['valid', 'revoked', 'expired', 'pending'],
      default: 'valid',
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revocationReason: {
      type: String,
      default: '',
    },
    revocationRequested: {
      type: Boolean,
      default: false,
    },
    revocationRequestReason: {
      type: String,
      default: '',
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    additionalInfo: {
      type: String,
      default: '',
      trim: true,
    },
    qrCodeDataUri: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast searching and filtering
certificateSchema.index({ institutionId: 1, status: 1 });
certificateSchema.index({ studentEmail: 1 });
certificateSchema.index({ courseName: 1 });
certificateSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Certificate', certificateSchema);
