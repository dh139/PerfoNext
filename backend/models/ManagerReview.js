const mongoose = require('mongoose');

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
    // 6 Core Manager Competencies (1 to 5 stars)
    competencyRatings: {
      communication: { type: Number, default: 4, min: 1, max: 5 },
      ownership: { type: Number, default: 4, min: 1, max: 5 },
      leadership: { type: Number, default: 4, min: 1, max: 5 },
      teamwork: { type: Number, default: 4, min: 1, max: 5 },
      learningAbility: { type: Number, default: 4, min: 1, max: 5 },
      problemSolving: { type: Number, default: 4, min: 1, max: 5 }
    },
    overallComments: {
      type: String,
      default: ''
    },
    overallRating: {
      type: Number,
      default: 4
    },
    details: [
      {
        category: String,
        kpiItemId: String,
        score: Number,
        comment: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('ManagerReview', managerReviewSchema);
