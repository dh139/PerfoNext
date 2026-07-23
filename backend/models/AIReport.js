const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReviewCycle'
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
  metadataMaxTime: {
    type: Number,
    required: true
  },
  metadataCount: {
    type: Number,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AIReport', aiReportSchema);
