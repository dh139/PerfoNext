const mongoose = require('mongoose');

const recognitionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    cycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewCycle',
      default: null,
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    comments: {
      type: String,
      trim: true
    },
    awardedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    awardedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recognition', recognitionSchema);
