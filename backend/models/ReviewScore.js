const mongoose = require('mongoose');

const reviewScoreSchema = new mongoose.Schema(
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
    categoryScores: {
      workQuality: { type: Number, default: 0 },
      productivity: { type: Number, default: 0 },
      technical: { type: Number, default: 0 },
      communication: { type: Number, default: 0 },
      ownership: { type: Number, default: 0 },
      learning: { type: Number, default: 0 }
    },
    finalScore: {
      type: Number,
      required: true
    },
    rating: {
      type: String,
      enum: ['Outstanding', 'Exceeds Expectations', 'Meets Expectations', 'Needs Improvement', 'Unsatisfactory'],
      required: true
    },
    calculatedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReviewScore', reviewScoreSchema);
