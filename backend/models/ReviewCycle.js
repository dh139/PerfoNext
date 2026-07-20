const mongoose = require('mongoose');

const reviewCycleSchema = new mongoose.Schema(
  {
    reviewMonth: {
      type: String,
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'closed'],
      default: 'draft',
      required: true,
      index: true
    },
    cycleType: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'monthly',
      required: true
    },
    kpiTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KpiTemplate',
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReviewCycle', reviewCycleSchema);
