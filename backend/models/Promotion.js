const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    currentDesignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      required: true
    },
    proposedDesignationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      required: true
    },
    supportingReviewScores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReviewScore'
      }
    ],
    recommendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['proposed', 'approved', 'rejected'],
      default: 'proposed',
      required: true,
      index: true
    },
    effectiveDate: {
      type: Date,
      required: true
    },
    salaryIncrementPercent: {
      type: Number,
      default: 0,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
