const mongoose = require('mongoose');

const selfAssessmentDetailSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['quality', 'productivity', 'technical', 'communication', 'ownership', 'learning'],
    required: true
  },
  kpiItemId: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    validate: {
      validator: function (v) {
        // 'this' refers to the detail sub-document
        if (this.score < 3) {
          return typeof v === 'string' && v.trim().length > 0;
        }
        return true;
      },
      message: 'Comment is required when score is less than 3.'
    }
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
