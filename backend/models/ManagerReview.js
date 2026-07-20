const mongoose = require('mongoose');

const managerReviewDetailSchema = new mongoose.Schema({
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
    required: [true, 'Comment is mandatory for Manager reviews.'],
    trim: true
  }
});

const managerReviewSchema = new mongoose.Schema(
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
    managerId: {
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
    details: [managerReviewDetailSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ManagerReview', managerReviewSchema);
