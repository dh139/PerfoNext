const mongoose = require('mongoose');

const workJournalSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    project: {
      type: String,
      default: '',
      trim: true
    },
    category: {
      type: String,
      default: 'General',
      required: true,
      trim: true,
      index: true
    },
    customFieldsData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    hoursSpent: {
      type: Number,
      default: 0
    },
    resultSummary: {
      type: String,
      default: '',
      trim: true
    },
    evidenceType: {
      type: String,
      default: 'Screenshot Upload',
      trim: true
    },
    evidenceRef: {
      type: String,
      default: '',
      trim: true
    },
    evidenceUrl: {
      type: String,
      default: ''
    },
    completedDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    // Manager Verification Fields
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'needs_changes'],
      default: 'submitted',
      required: true,
      index: true
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    managerFeedback: {
      type: String,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkJournal', workJournalSchema);
