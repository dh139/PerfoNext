const mongoose = require('mongoose');

const selfAssessmentDetailSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: true
  }
});

const selfAssessmentSchema = new mongoose.Schema(
  {
    reviewCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewCycle',
      required: true,
      index: true
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'submitted'],
      default: 'draft',
      required: true,
      index: true
    },
    submittedAt: {
      type: Date
    },
    details: [selfAssessmentDetailSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('SelfAssessment', selfAssessmentSchema);
