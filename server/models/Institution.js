const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: [150, 'Institution name cannot exceed 150 characters'],
    },
    institutionType: {
      type: String,
      required: [true, 'Institution type is required'],
      enum: [
        'University',
        'College',
        'Certification Body',
        'Online Academy',
        'High School',
        'Vocational Institute',
        'Corporate Training',
        'Other',
      ],
      default: 'University',
    },
    officialEmail: {
      type: String,
      required: [true, 'Official email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid official email address',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
institutionSchema.index({ approvalStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Institution', institutionSchema);
