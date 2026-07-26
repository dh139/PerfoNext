const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reviewCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewCycle',
    required: true,
    index: true
  },
  summary: {
    type: String,
    required: true
  },
  strengths: {
    type: [String],
    default: []
  },
  improvements: {
    type: [String],
    default: []
  },
  sentiment: {
    type: String,
    default: 'Neutral'
  },
  turnoverRisk: {
    type: String,
    default: 'Low'
  },
  actionItems: {
    type: [String],
    default: []
  },
  prompt: {
    type: String
  },
  responseRaw: {
    type: String
  },
  modelUsed: {
    type: String
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  reviewMonth: {
    type: String
  },
  status: {
    type: String,
    enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'COMPLETED',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure a single unique AI report per employee per review cycle
aiReportSchema.index({ employeeId: 1, reviewCycleId: 1 }, { unique: true });

module.exports = mongoose.model('AIReport', aiReportSchema);
