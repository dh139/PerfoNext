const mongoose = require('mongoose');

const pipGoalSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  targetDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'missed'],
    default: 'pending',
    required: true
  }
});

const pipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    triggerReviewScoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewScore',
      default: null
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    goals: [pipGoalSchema],
    status: {
      type: String,
      enum: ['active', 'closed', 'escalated'],
      default: 'active',
      required: true,
      index: true
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    hrReviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    closureNotes: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pip', pipSchema);
